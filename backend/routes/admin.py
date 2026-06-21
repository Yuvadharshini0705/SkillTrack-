"""
routes/admin.py — SkillTrack v4 Admin Routes
New features:
  - Permanent student delete (removes user + all data)
  - Course enrollment removal
  - Email notifications after task actions
"""

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_db
from models import make_task, make_course, serialize, oid
from functools import wraps
from datetime import datetime, timedelta
import csv
import io

admin_bp = Blueprint("admin", __name__)


def admin_required(f):
    @wraps(f)
    @jwt_required()
    def wrapped(*args, **kwargs):
        db   = get_db()
        user = db.users.find_one({"_id": oid(get_jwt_identity())})
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return wrapped


# ── Dashboard ──────────────────────────────────────────────────────────────────

@admin_bp.route("/dashboard", methods=["GET"])
@admin_required
def dashboard():
    db       = get_db()
    week_ago = datetime.utcnow() - timedelta(days=7)

    total_students = db.users.count_documents({"role": "student"})
    active_ct      = db.users.count_documents({"role": "student", "is_active": True})
    total_tasks    = db.tasks.count_documents({})
    pending_tasks  = db.tasks.count_documents({"status": "pending"})
    total_subs     = db.performances.count_documents({})
    active_set     = db.performances.distinct("user_id", {"submitted_at": {"$gte": week_ago}})
    total_courses  = db.courses.count_documents({"is_active": True})
    decay_events   = db.skill_decay_logs.count_documents({"logged_at": {"$gte": week_ago}})

    return jsonify({"stats": {
        "total_students":       total_students,
        "active_students":      active_ct,
        "active_students_week": len(active_set),
        "total_tasks":          total_tasks,
        "pending_review":       pending_tasks,
        "total_submissions":    total_subs,
        "total_courses":        total_courses,
        "decay_events_week":    decay_events,
    }}), 200


# ── Students ───────────────────────────────────────────────────────────────────

@admin_bp.route("/students", methods=["GET"])
@admin_required
def list_students():
    db       = get_db()
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search   = request.args.get("search", "")
    status_f = request.args.get("status", "")   # "active" | "inactive" | ""

    query: dict = {"role": "student"}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"profile.full_name": {"$regex": search, "$options": "i"}},
        ]
    if status_f == "active":
        query["is_active"] = True
    elif status_f == "inactive":
        query["is_active"] = False

    total    = db.users.count_documents(query)
    students = list(db.users.find(
        query,
        skip=(page - 1) * per_page,
        limit=per_page,
        sort=[("created_at", -1)]
    ))
    from models import user_to_dict
    return jsonify({
        "students": [user_to_dict(s) for s in students],
        "total":    total,
        "pages":    max(1, (total + per_page - 1) // per_page),
    }), 200


@admin_bp.route("/students/<student_id>/toggle", methods=["POST"])
@admin_required
def toggle_student(student_id):
    db   = get_db()
    user = db.users.find_one({"_id": oid(student_id)})
    if not user:
        return jsonify({"error": "Not found"}), 404
    new_val = not user.get("is_active", True)
    db.users.update_one({"_id": oid(student_id)}, {"$set": {"is_active": new_val}})
    return jsonify({"is_active": new_val}), 200


@admin_bp.route("/students/<student_id>", methods=["DELETE"])
@admin_required
def delete_student(student_id):
    """
    Permanently delete a student and ALL their data:
      - User document
      - Performances
      - Test sessions
      - Task assignments
      - Notifications
      - Skill decay logs
    Query param: ?confirm=true required to prevent accidental deletion.
    """
    db = get_db()

    confirm = request.args.get("confirm", "false").lower() == "true"
    if not confirm:
        return jsonify({
            "error": "Add ?confirm=true to permanently delete this student."
        }), 400

    user = db.users.find_one({"_id": oid(student_id)})
    if not user:
        return jsonify({"error": "Student not found"}), 404
    if user.get("role") == "admin":
        return jsonify({"error": "Cannot delete admin accounts"}), 403

    uid_str = str(user["_id"])

    # Delete all related data
    perf_del   = db.performances.delete_many({"user_id": uid_str})
    sess_del   = db.test_sessions.delete_many({"user_id": uid_str})
    assign_del = db.task_assignments.delete_many({"user_id": uid_str})
    notif_del  = db.notifications.delete_many({"user_id": uid_str})
    decay_del  = db.skill_decay_logs.delete_many({"user_id": uid_str})
    db.email_logs.delete_many({"user_id": uid_str})
    db.users.delete_one({"_id": oid(student_id)})

    deleted_data = {
        "performances":  perf_del.deleted_count,
        "test_sessions": sess_del.deleted_count,
        "assignments":   assign_del.deleted_count,
        "notifications": notif_del.deleted_count,
        "decay_logs":    decay_del.deleted_count,
    }

    # ── Email: account deleted notification ───────────────────────────────────
    try:
        student_email = user.get("email", "")
        full_name     = user.get("profile", {}).get("full_name", "")
        if student_email:
            from services.email_service import send_account_deleted_email
            send_account_deleted_email(
                to_email=student_email,
                full_name=full_name,
                deleted_data=deleted_data,
            )
    except Exception as _e:
        print(f"[ADMIN] Account deleted email error (non-fatal): {_e}")

    return jsonify({
        "message":      f"Student '{user.get('email', student_id)}' permanently deleted",
        "deleted_data": deleted_data,
    }), 200


@admin_bp.route("/students/<student_id>/remove-course", methods=["POST"])
@admin_required
def remove_student_from_course(student_id):
    """Remove a student from a specific course (deletes enrollment + all course data)."""
    db        = get_db()
    data      = request.get_json()
    course_id = data.get("course_id", "")
    if not course_id:
        return jsonify({"error": "course_id required"}), 400

    user = db.users.find_one({"_id": oid(student_id)})
    if not user:
        return jsonify({"error": "Student not found"}), 404

    # Remove course from enrollment array
    db.users.update_one(
        {"_id": oid(student_id)},
        {"$pull": {"profile.courses": {"course_id": str(course_id)}}}
    )

    # Delete course-specific data
    uid_str = str(student_id)
    db.performances.delete_many({"user_id": uid_str, "course_id": str(course_id)})
    db.test_sessions.delete_many({"user_id": uid_str, "course_id": str(course_id)})
    db.task_assignments.delete_many({"user_id": uid_str, "course_id": str(course_id)})
    db.skill_decay_logs.delete_many({"user_id": uid_str, "course_id": str(course_id)})

    return jsonify({"message": "Student removed from course permanently"}), 200


@admin_bp.route("/students/<student_id>/detail", methods=["GET"])
@admin_required
def student_detail(student_id):
    """Get detailed analytics for a specific student."""
    db   = get_db()
    user = db.users.find_one({"_id": oid(student_id)})
    if not user:
        return jsonify({"error": "Not found"}), 404

    uid_str = str(user["_id"])
    from models import user_to_dict

    # Recent performances
    perfs = list(db.performances.find(
        {"user_id": uid_str},
        sort=[("submitted_at", -1)],
        limit=20
    ))

    # Skill decay logs
    decay_logs = list(db.skill_decay_logs.find(
        {"user_id": uid_str},
        sort=[("logged_at", -1)],
        limit=10
    ))

    # Test session summary per course
    course_summaries = []
    for enrollment in user.get("profile", {}).get("courses", []):
        cid    = str(enrollment.get("course_id", ""))
        course = db.courses.find_one({"_id": oid(cid)})
        if not course:
            continue
        sessions = db.test_sessions.count_documents({"user_id": uid_str, "course_id": cid, "completed": True})
        course_summaries.append({
            "course_id":    cid,
            "course_name":  course.get("name", ""),
            "skill_score":  enrollment.get("skill_score", 75),
            "current_day":  enrollment.get("current_day", 1),
            "sessions_done": sessions,
        })

    return jsonify({
        "student":         user_to_dict(user),
        "performances":    [serialize(p) for p in perfs],
        "decay_logs":      [serialize(d) for d in decay_logs],
        "course_summaries": course_summaries,
    }), 200


# ── Courses — PUBLIC ──────────────────────────────────────────────────────────

@admin_bp.route("/courses/public", methods=["GET"])
@jwt_required()
def list_courses_public():
    db      = get_db()
    courses = list(db.courses.find({"is_active": True}))
    return jsonify([serialize(c) for c in courses]), 200


# ── Tasks ──────────────────────────────────────────────────────────────────────

@admin_bp.route("/tasks", methods=["GET"])
@admin_required
def list_tasks():
    db        = get_db()
    page      = request.args.get("page",      1,  type=int)
    per_page  = request.args.get("per_page",  15, type=int)
    status    = request.args.get("status",    "")
    source    = request.args.get("source",    "")
    course_id = request.args.get("course_id", "")
    task_type = request.args.get("task_type", "")

    query: dict = {}
    if status:    query["status"]    = status
    if source:    query["source"]    = source
    if course_id: query["course_id"] = course_id
    if task_type: query["task_type"] = task_type

    total = db.tasks.count_documents(query)
    tasks = list(db.tasks.find(
        query,
        skip=(page - 1) * per_page,
        limit=per_page,
        sort=[("created_at", -1)]
    ))
    return jsonify({
        "tasks": [serialize(t) for t in tasks],
        "total": total,
        "pages": max(1, (total + per_page - 1) // per_page),
    }), 200


@admin_bp.route("/tasks/create", methods=["POST"])
@admin_required
def create_task():
    db   = get_db()
    data = request.get_json()

    course = db.courses.find_one({"_id": oid(str(data.get("course_id", "")))})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    status = data.get("status", "pending")
    doc    = make_task(
        course_id        = str(course["_id"]),
        title            = data.get("title", "Untitled"),
        task_type        = data.get("task_type", "mcq"),
        difficulty       = data.get("difficulty", "beginner"),
        topic            = data.get("topic", ""),
        content          = data.get("content", {}),
        solution         = data.get("solution", ""),
        explanation      = data.get("explanation", ""),
        difficulty_score = data.get("difficulty_score", 1),
        subtopic         = data.get("subtopic", ""),
        day_range_start  = data.get("day_range_start", 1),
        day_range_end    = data.get("day_range_end", data.get("day_range_start", 1)),
        source           = "manual",
        status           = status,
        xp_reward        = int(data.get("xp_reward", 10)),
        time_limit       = int(data.get("time_limit", 300)),
        tags             = data.get("tags", []),
        is_recovery      = bool(data.get("is_recovery", False)),
        created_by       = get_jwt_identity(),
    )
    r = db.tasks.insert_one(doc)
    doc["_id"] = r.inserted_id

    if status == "approved":
        try:
            from utils.assignment import notify_students_of_new_tasks
            notify_students_of_new_tasks(db, str(course["_id"]), course.get("name", ""))
        except Exception as e:
            print(f"[ADMIN] Notify error (non-fatal): {e}")

    return jsonify({"message": "Task created", "task": serialize(doc)}), 201


@admin_bp.route("/tasks/curriculum-info", methods=["GET"])
@admin_required
def curriculum_info():
    """
    Returns phase/difficulty info for a given course + day.
    Used by the Rule Builder modal to auto-fill fields.
    """
    from services.task_engine import get_phase_for_day

    db        = get_db()
    course_id = request.args.get("course_id", "").strip()
    day       = request.args.get("day", 1, type=int)

    if not course_id:
        return jsonify({"error": "course_id required"}), 400

    course = db.courses.find_one({"_id": oid(course_id)})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    difficulty = get_phase_for_day(day)

    # Try to find an existing task for this day to suggest topic/subtopic
    existing = db.tasks.find_one({
        "course_id":       str(course_id),
        "day_range_start": day,
        "status":          {"$in": ["approved", "pending"]},
    })

    topic    = existing.get("topic",   "") if existing else ""
    subtopic = existing.get("subtopic","") if existing else ""
    count    = db.tasks.count_documents({
        "course_id":       str(course_id),
        "day_range_start": day,
    })

    return jsonify({
        "course_id":     str(course_id),
        "course_name":   course.get("name", ""),
        "day":           day,
        "difficulty":    difficulty,
        "topic":         topic,
        "subtopic":      subtopic,
        "existing_tasks": count,
    }), 200

@admin_bp.route("/tasks/bulk-approve", methods=["POST"])
@admin_required
def bulk_approve():
    db     = get_db()
    data   = request.get_json(silent=True) or {}
    query  = {"status": "pending"}
    course = None

    if data.get("course_slug"):
        course = db.courses.find_one({"slug": data["course_slug"]})
        if course:
            query["course_id"] = str(course["_id"])
    if data.get("day"):
        query["day_range_start"] = int(data["day"])

    result = db.tasks.update_many(query, {"$set": {"status": "approved"}})

    if result.modified_count > 0:
        try:
            from utils.assignment import notify_students_of_new_tasks
            if course:
                notify_students_of_new_tasks(db, str(course["_id"]), course.get("name", ""))
            else:
                for cid in db.tasks.distinct("course_id", {"status": "approved"}):
                    c = db.courses.find_one({"_id": oid(cid)})
                    if c:
                        notify_students_of_new_tasks(db, str(c["_id"]), c.get("name", ""))
        except Exception as e:
            print(f"[ADMIN] Bulk approve notify error (non-fatal): {e}")

    return jsonify({
        "message":       f"Approved {result.modified_count} tasks",
        "approved_count": result.modified_count,
    }), 200


@admin_bp.route("/tasks/csv-template", methods=["GET"])
@admin_required
def csv_template():
    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        "course_slug", "title", "task_type", "difficulty", "topic",
        "subtopic", "question", "option_a", "option_b", "option_c", "option_d",
        "solution", "explanation", "key_points", "word_limit", "buggy_code",
        "starter_code", "expected_output", "language", "hints", "bug_count",
        "constraints", "xp_reward", "time_limit", "day_range_start", "day_range_end",
        "difficulty_score", "tags", "is_recovery",
    ]
    writer.writerow(headers)
    writer.writerow([
        "mern-stack", "JavaScript const vs let", "mcq", "beginner",
        "JavaScript Variables", "var/let/const",
        "Which keyword creates a block-scoped variable that CANNOT be reassigned?",
        "A) var", "B) let", "C) const", "D) function", "C",
        "const creates a binding that cannot be reassigned.",
        "", "", "", "", "", "", "", "", "", 10, 120, 1, 1, 2,
        "javascript|variables|beginner", "false",
    ])
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=skilltrack_tasks_template.csv",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@admin_bp.route("/tasks/upload-csv", methods=["POST"])
@admin_required
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file in request. Use multipart/form-data with field name 'file'."}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "File must be a .csv"}), 400

    validate_only = request.form.get("validate_only", "false").lower() == "true"
    auto_approve  = request.form.get("auto_approve",  "false").lower() == "true"

    try:
        content_bytes = file.stream.read()
        stream = io.StringIO(content_bytes.decode("utf-8-sig"))
    except UnicodeDecodeError:
        try:
            stream = io.StringIO(content_bytes.decode("latin-1"))
        except Exception:
            return jsonify({"error": "Could not decode file. Save as UTF-8 CSV."}), 400

    reader = csv.DictReader(stream)

    REQUIRED_HEADERS = {"course_slug", "title", "task_type", "difficulty", "topic", "solution"}
    if reader.fieldnames is None:
        return jsonify({"error": "CSV file appears to be empty."}), 400

    actual_headers  = set(h.strip() for h in reader.fieldnames)
    missing_headers = REQUIRED_HEADERS - actual_headers
    if missing_headers:
        return jsonify({
            "error": f"CSV is missing required columns: {', '.join(sorted(missing_headers))}",
            "hint":  "Download the template to see the correct column names.",
        }), 400

    db = get_db()
    results  = []
    inserted = 0
    error_ct = 0

    VALID_TYPES  = {"mcq", "debug", "coding", "theory"}
    VALID_DIFFS  = {"beginner", "intermediate", "advanced", "expert"}
    course_cache = {}

    for row_num, raw_row in enumerate(reader, start=2):
        row = {k.strip(): v.strip() for k, v in raw_row.items() if k}
        row_errors = []

        task_type   = row.get("task_type",   "").lower()
        difficulty  = row.get("difficulty",  "").lower()
        title       = row.get("title",       "").strip()
        course_slug = row.get("course_slug", "").strip()
        topic       = row.get("topic",       "").strip()
        solution    = row.get("solution",    "").strip()

        if not title:       row_errors.append("title is required")
        if not course_slug: row_errors.append("course_slug is required")
        if not topic:       row_errors.append("topic is required")
        if not solution:    row_errors.append("solution is required")
        if task_type not in VALID_TYPES:
            row_errors.append(f"task_type must be one of: {', '.join(VALID_TYPES)}")
        if difficulty not in VALID_DIFFS:
            row_errors.append(f"difficulty must be one of: {', '.join(VALID_DIFFS)}")

        try:
            xp_reward = int(row.get("xp_reward", 10) or 10)
            if xp_reward < 1 or xp_reward > 200:
                row_errors.append("xp_reward must be between 1 and 200")
        except ValueError:
            row_errors.append("xp_reward must be a number")
            xp_reward = 10

        try:
            time_limit = int(row.get("time_limit", 300) or 300)
        except ValueError:
            row_errors.append("time_limit must be a number")
            time_limit = 300

        try:
            day_start = int(row.get("day_range_start", 1) or 1)
            day_end   = day_start
            if day_start < 1:
                row_errors.append("day_range_start must be >= 1")
        except ValueError:
            row_errors.append("day_range_start must be a number")
            day_start, day_end = 1, 1

        try:
            diff_score = int(row.get("difficulty_score", 2) or 2)
        except ValueError:
            diff_score = 2

        if course_slug and not row_errors:
            if course_slug not in course_cache:
                course_cache[course_slug] = db.courses.find_one({"slug": course_slug})
            course = course_cache[course_slug]
            if not course:
                row_errors.append(f"No course found with slug '{course_slug}'.")
        else:
            course = None

        content = {}
        if not row_errors and task_type == "mcq":
            options = [row.get(f"option_{l}", "").strip() for l in ["a","b","c","d"]]
            options = [o for o in options if o]
            if len(options) < 2:
                row_errors.append("MCQ tasks need at least 2 options")
            correct_letter = solution.strip().upper()[:1] if solution else ""
            if correct_letter not in "ABCD":
                row_errors.append("MCQ solution must be A, B, C, or D")
            content = {
                "question":       row.get("question", title),
                "options":        options,
                "correct_option": correct_letter,
                "correct_text":   next((o[2:].strip() for o in options if o.upper().startswith(correct_letter)), ""),
            }
        elif not row_errors and task_type == "theory":
            content = {
                "question":      row.get("question", title),
                "question_type": "short_answer",
                "key_points":    [p.strip() for p in row.get("key_points","").split("|") if p.strip()],
                "word_limit":    int(row.get("word_limit", 150) or 150),
            }
        elif not row_errors and task_type == "debug":
            buggy = row.get("buggy_code", "").strip()
            if not buggy:
                row_errors.append("Debug tasks require buggy_code column")
            content = {
                "buggy_code":      buggy,
                "language":        row.get("language", "javascript") or "javascript",
                "expected_output": row.get("expected_output", ""),
                "hints":           [h.strip() for h in row.get("hints","").split("|") if h.strip()],
                "bug_count":       int(row.get("bug_count", 1) or 1),
            }
        elif not row_errors and task_type == "coding":
            content = {
                "problem":      row.get("question", title),
                "starter_code": row.get("starter_code", ""),
                "language":     row.get("language", "javascript") or "javascript",
                "constraints":  [c.strip() for c in row.get("constraints","").split("|") if c.strip()],
                "test_cases":   [],
            }

        if row_errors:
            error_ct += 1
            results.append({
                "row": row_num, "status": "error",
                "title": title or f"(row {row_num})", "errors": row_errors,
            })
            continue

        if validate_only:
            results.append({
                "row": row_num, "status": "valid", "title": title,
                "type": task_type, "diff": difficulty, "day": day_start,
            })
            continue

        try:
            tags        = [t.strip() for t in row.get("tags","").split("|") if t.strip()]
            is_recovery = row.get("is_recovery","false").lower() == "true"
            doc = make_task(
                course_id=str(course["_id"]), title=title, task_type=task_type,
                difficulty=difficulty, topic=topic, subtopic=row.get("subtopic",""),
                content=content, solution=solution, explanation=row.get("explanation",""),
                difficulty_score=diff_score, day_range_start=day_start, day_range_end=day_start,
                source="manual", status="approved" if auto_approve else "pending",
                xp_reward=xp_reward, time_limit=time_limit, tags=tags,
                is_recovery=is_recovery, created_by=get_jwt_identity(),
            )
            db.tasks.insert_one(doc)
            inserted += 1
            results.append({
                "row": row_num, "status": "inserted", "title": title,
                "type": task_type, "diff": difficulty, "day": day_start,
            })
        except Exception as e:
            error_ct += 1
            results.append({
                "row": row_num, "status": "error", "title": title,
                "errors": [f"DB insert failed: {str(e)}"],
            })

    total_rows = len(results)
    if inserted > 0 and auto_approve and not validate_only:
        try:
            from utils.assignment import notify_students_of_new_tasks
            for slug, c in course_cache.items():
                if c:
                    notify_students_of_new_tasks(db, str(c["_id"]), c.get("name", ""))
        except Exception as e:
            print(f"[ADMIN] CSV upload notify error (non-fatal): {e}")

    return jsonify({
        "message":       f"{'Validated' if validate_only else 'Processed'} {total_rows} rows — "
                         f"{inserted if not validate_only else total_rows - error_ct} valid, {error_ct} errors.",
        "total":         total_rows,
        "inserted":      inserted,
        "valid":         total_rows - error_ct,
        "errors":        error_ct,
        "validate_only": validate_only,
        "auto_approved": auto_approve and not validate_only,
        "results":       results,
    }), 200


@admin_bp.route("/tasks/<task_id>/review", methods=["POST"])
@admin_required
def review_task(task_id):
    db     = get_db()
    task   = db.tasks.find_one({"_id": oid(task_id)})
    if not task:
        return jsonify({"error": "Task not found"}), 404

    action = request.get_json().get("action", "")
    if action not in ("approve", "reject"):
        return jsonify({"error": "Invalid action"}), 400

    new_status = "approved" if action == "approve" else "rejected"
    db.tasks.update_one({"_id": oid(task_id)}, {"$set": {"status": new_status}})
    task["status"] = new_status

    if new_status == "approved":
        try:
            from utils.assignment import notify_students_of_new_tasks
            course = db.courses.find_one({"_id": oid(task.get("course_id", ""))})
            if course:
                notify_students_of_new_tasks(db, str(course["_id"]), course.get("name", ""))
        except Exception as e:
            print(f"[ADMIN] Review notify error (non-fatal): {e}")

    return jsonify({"message": f"Task {action}d", "task": serialize(task)}), 200


@admin_bp.route("/tasks/<task_id>", methods=["PUT"])
@admin_required
def update_task(task_id):
    db   = get_db()
    task = db.tasks.find_one({"_id": oid(task_id)})
    if not task:
        return jsonify({"error": "Task not found"}), 404
    data    = request.get_json()
    allowed = ["title", "task_type", "difficulty", "topic", "subtopic",
               "content", "solution", "explanation", "xp_reward",
               "time_limit", "tags", "is_recovery", "day_range_start",
               "day_range_end", "status"]
    update = {k: data[k] for k in allowed if k in data}
    if "day_range_start" in update and "day_range_end" not in data:
        update["day_range_end"] = update["day_range_start"]
    db.tasks.update_one({"_id": oid(task_id)}, {"$set": update})
    task.update(update)
    return jsonify({"message": "Task updated", "task": serialize(task)}), 200


@admin_bp.route("/tasks/<task_id>", methods=["DELETE"])
@admin_required
def delete_task(task_id):
    db     = get_db()
    result = db.tasks.delete_one({"_id": oid(task_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"message": "Task deleted"}), 200


# ── Courses ────────────────────────────────────────────────────────────────────

@admin_bp.route("/courses", methods=["GET"])
@admin_required
def list_courses():
    db      = get_db()
    courses = list(db.courses.find({}))
    return jsonify([serialize(c) for c in courses]), 200


@admin_bp.route("/courses", methods=["POST"])
@admin_required
def create_course():
    db   = get_db()
    data = request.get_json()
    if db.courses.find_one({"slug": data.get("slug", "")}):
        return jsonify({"error": "Slug already exists"}), 409
    doc = make_course(
        name          = data["name"],
        slug          = data["slug"],
        description   = data.get("description", ""),
        icon          = data.get("icon", "💻"),
        color         = data.get("color", "#6366f1"),
        duration_days = data.get("duration_days", 180),
    )
    r = db.courses.insert_one(doc)
    doc["_id"] = r.inserted_id
    return jsonify(serialize(doc)), 201


@admin_bp.route("/courses/<course_id>", methods=["PUT"])
@admin_required
def update_course(course_id):
    db     = get_db()
    course = db.courses.find_one({"_id": oid(course_id)})
    if not course:
        return jsonify({"error": "Course not found"}), 404
    data    = request.get_json()
    allowed = ["name", "description", "icon", "color", "duration_days", "is_active"]
    update  = {k: data[k] for k in allowed if k in data}
    db.courses.update_one({"_id": oid(course_id)}, {"$set": update})
    course.update(update)
    return jsonify(serialize(course)), 200


@admin_bp.route("/courses/<course_id>", methods=["DELETE"])
@admin_required
def delete_course(course_id):
    db     = get_db()
    course = db.courses.find_one({"_id": oid(course_id)})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    permanent = request.args.get("permanent", "false").lower() == "true"
    if permanent:
        tasks_result = db.tasks.delete_many({"course_id": str(course_id)})
        db.courses.delete_one({"_id": oid(course_id)})
        return jsonify({
            "message":       "Course permanently deleted",
            "tasks_deleted": tasks_result.deleted_count,
        }), 200

    db.courses.update_one({"_id": oid(course_id)}, {"$set": {"is_active": False}})
    return jsonify({"message": "Course deactivated"}), 200


# ── Decay Logs ─────────────────────────────────────────────────────────────────

@admin_bp.route("/decay-logs", methods=["GET"])
@admin_required
def decay_logs():
    db   = get_db()
    logs = list(db.skill_decay_logs.find({}, sort=[("logged_at", -1)], limit=100))
    return jsonify([serialize(l) for l in logs]), 200


# ── Analytics Overview ─────────────────────────────────────────────────────────



@admin_bp.route("/analytics", methods=["GET"])
@admin_required
def analytics_overview():
    db            = get_db()
    now           = datetime.utcnow()
    week_ago      = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    from collections import defaultdict

    # ── 1. Submission trend — last 7 days ─────────────────────────────────────
    daily_subs = defaultdict(int)
    for p in db.performances.find({"submitted_at": {"$gte": week_ago}}):
        raw     = p.get("submitted_at")
        day_key = raw.strftime("%Y-%m-%d") if hasattr(raw, "strftime") else str(raw)[:10]
        daily_subs[day_key] += 1
    submission_trend = [{"date": d, "submissions": c} for d, c in sorted(daily_subs.items())]

    # ── 2. Top 8 students by XP ───────────────────────────────────────────────
    top_raw = list(db.users.find(
        {"role": "student", "is_active": True},
        sort=[("profile.total_xp", -1)],
        limit=8
    ))
    top_students = [
        {
            "name": s.get("profile", {}).get("full_name") or s.get("email", "?").split("@")[0],
            "xp":   s.get("profile", {}).get("total_xp", 0),
        }
        for s in top_raw
    ]

    # ── 3. Skill distribution by enrollment score ─────────────────────────────
    skill_buckets = {
        "Expert (85+)":       0,
        "Proficient (70-84)": 0,
        "Developing (55-69)": 0,
        "Struggling (<55)":   0,
    }
    for s in db.users.find({"role": "student"}):
        for enrollment in s.get("profile", {}).get("courses", []):
            score = float(enrollment.get("skill_score", 75))
            if score >= 85:
                skill_buckets["Expert (85+)"] += 1
            elif score >= 70:
                skill_buckets["Proficient (70-84)"] += 1
            elif score >= 55:
                skill_buckets["Developing (55-69)"] += 1
            else:
                skill_buckets["Struggling (<55)"] += 1

    # ── 4. Task type breakdown — approved tasks ───────────────────────────────
    task_type_breakdown = defaultdict(int)
    for t in db.tasks.find({"status": "approved"}, {"task_type": 1}):
        task_type_breakdown[t.get("task_type", "unknown")] += 1

    # ── 5. Daily active users — last 14 days ─────────────────────────────────
    daily_users = defaultdict(set)
    for p in db.performances.find({"submitted_at": {"$gte": two_weeks_ago}}):
        raw     = p.get("submitted_at")
        day_key = raw.strftime("%Y-%m-%d") if hasattr(raw, "strftime") else str(raw)[:10]
        daily_users[day_key].add(str(p.get("user_id", "")))
    active_users_trend = [
        {"date": d, "users": len(uids)}
        for d, uids in sorted(daily_users.items())
    ]

    # ── 6. Course-wise students ───────────────────────────────────────────────
    courses     = list(db.courses.find({"is_active": True}))
    course_map  = {str(c["_id"]): c.get("name", "Unknown") for c in courses}

    # Build per-course student list with xp, submissions, progress, status
    course_students = {}
    for course in courses:
        cid  = str(course["_id"])
        name = course.get("name", "Unknown")

        enrolled = list(db.users.find(
            {
                "role": "student",
                "is_active": True,
                "profile.courses.course_id": cid,
            },
            {
                "profile.full_name":  1,
                "profile.total_xp":   1,
                "profile.courses":    1,
                "email":              1,
                "last_active":        1,
            }
        ))

        students_out = []
        for s in enrolled:
            uid     = str(s["_id"])
            profile = s.get("profile", {})
            full_name = profile.get("full_name") or s.get("email", "?").split("@")[0]

            # Find enrollment record for this course
            enrollment = next(
                (e for e in profile.get("courses", []) if str(e.get("course_id")) == cid),
                {}
            )
            skill_score  = float(enrollment.get("skill_score", 75))
            current_day  = int(enrollment.get("current_day", 1))
            duration     = int(course.get("duration_days", 180))
            progress_pct = min(100, round((current_day / duration) * 100))

            # Submission count for this course
            sub_count = db.performances.count_documents({"user_id": uid, "course_id": cid})

            # Last active
            last_perf = db.performances.find_one(
                {"user_id": uid, "course_id": cid},
                sort=[("submitted_at", -1)],
                projection={"submitted_at": 1},
            )
            last_active_dt = last_perf.get("submitted_at") if last_perf else None
            if last_active_dt and hasattr(last_active_dt, "strftime"):
                delta = now - last_active_dt
                if delta.days == 0:
                    hrs = max(1, delta.seconds // 3600)
                    last_active_str = f"{hrs}h ago"
                else:
                    last_active_str = f"{delta.days}d ago"
            else:
                last_active_str = "Never"

            # Status
            if skill_score >= 80 and sub_count >= 20:
                status = "top"
            elif last_active_dt and (now - last_active_dt).days > 3:
                status = "needs-help"
            else:
                status = "active"

            students_out.append({
                "id":          uid,
                "name":        full_name,
                "xp":          profile.get("total_xp", 0),
                "submissions": sub_count,
                "progress":    progress_pct,
                "skill_score": round(skill_score, 1),
                "status":      status,
                "last_active": last_active_str,
            })

        # Sort by XP desc
        students_out.sort(key=lambda x: x["xp"], reverse=True)
        course_students[cid] = {
            "course_name": name,
            "students":    students_out,
        }

    return jsonify({
        "submission_trend":    submission_trend,
        "top_students":        top_students,
        "skill_distribution":  skill_buckets,
        "task_type_breakdown": dict(task_type_breakdown),
        "active_users_trend":  active_users_trend,
        "course_students":     course_students,   # {course_id: {course_name, students[]}}
    }), 200