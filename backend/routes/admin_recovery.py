"""
routes/admin_recovery.py  —  Admin Recovery Dashboard API
==========================================================
Register in app.py:
    from routes.admin_recovery import admin_recovery_bp
    app.register_blueprint(admin_recovery_bp, url_prefix="/api/admin/recovery")

Endpoints:
  GET  /api/admin/recovery/overview          — summary stats
  GET  /api/admin/recovery/students          — all students in recovery (paginated)
  GET  /api/admin/recovery/students/<uid>    — single student recovery detail
  POST /api/admin/recovery/assign/<uid>      — manually assign recovery tasks
  GET  /api/admin/recovery/tasks/coverage    — which topics have is_recovery tasks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from db import get_db
from models import oid, serialize, make_notification
from services.skill_engine import (
    RECOVERY_TASK_THRESHOLD,
    RECOVERY_UI_THRESHOLD,
    CRITICAL_THRESHOLD,
    _get_weak_topics,
    _assign_recovery_tasks,
)

admin_recovery_bp = Blueprint("admin_recovery", __name__)


def _require_admin(uid):
    db   = get_db()
    user = db.users.find_one({"_id": oid(uid)})
    return bool(user and user.get("role") == "admin")


# ─────────────────────────────────────────────────────────────────────────────
# OVERVIEW — summary numbers for the dashboard header cards
# ─────────────────────────────────────────────────────────────────────────────

@admin_recovery_bp.route("/overview", methods=["GET"])
@jwt_required()
def recovery_overview():
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db = get_db()

    all_students = list(db.users.find(
        {"role": "student", "is_active": True},
        {"_id": 1, "profile.courses": 1, "profile.full_name": 1}
    ))

    total          = len(all_students)
    critical       = 0
    in_recovery    = 0
    needs_watch    = 0   # score 50-65 — at risk
    healthy        = 0

    for student in all_students:
        scores = [
            float(c.get("skill_score", 100))
            for c in student.get("profile", {}).get("courses", [])
        ]
        if not scores:
            continue
        lowest = min(scores)
        if lowest <= CRITICAL_THRESHOLD:
            critical += 1
        elif lowest <= RECOVERY_TASK_THRESHOLD:
            in_recovery += 1
        elif lowest <= 65:
            needs_watch += 1
        else:
            healthy += 1

    # Pending recovery assignments across all students
    pending_assignments = db.task_assignments.count_documents({
        "is_recovery": True,
        "status":      "pending",
    })

    completed_today = db.task_assignments.count_documents({
        "is_recovery":   True,
        "status":        "completed",
        "assigned_date": datetime.utcnow().date().isoformat(),
    })

    # Recovery tasks available in task bank
    recovery_tasks_available = db.tasks.count_documents({
        "is_recovery": True,
        "status":      "approved",
    })

    return jsonify({
        "overview": {
            "total_students":          total,
            "critical":                critical,
            "in_recovery":             in_recovery,
            "needs_watch":             needs_watch,
            "healthy":                 healthy,
            "pending_assignments":     pending_assignments,
            "completed_today":         completed_today,
            "recovery_tasks_available": recovery_tasks_available,
            "thresholds": {
                "critical":  CRITICAL_THRESHOLD,
                "recovery":  RECOVERY_TASK_THRESHOLD,
                "ui_mode":   RECOVERY_UI_THRESHOLD,
            }
        }
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# STUDENTS IN RECOVERY — paginated list
# ─────────────────────────────────────────────────────────────────────────────

@admin_recovery_bp.route("/students", methods=["GET"])
@jwt_required()
def recovery_students():
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db         = get_db()
    page       = int(request.args.get("page", 1))
    limit      = int(request.args.get("limit", 20))
    skip       = (page - 1) * limit
    filter_by  = request.args.get("filter", "all")   # all | critical | recovery | watch
    course_id  = request.args.get("course_id", "")
    search     = request.args.get("search", "").strip()

    all_students = list(db.users.find(
        {"role": "student", "is_active": True},
        {
            "_id": 1,
            "email": 1,
            "profile.full_name": 1,
            "profile.courses":   1,
            "profile.current_streak": 1,
        }
    ))

    rows = []
    for student in all_students:
        s_uid    = str(student["_id"])
        courses  = student.get("profile", {}).get("courses", [])

        if course_id:
            courses = [c for c in courses if str(c.get("course_id")) == course_id]

        if not courses:
            continue

        for enrollment in courses:
            score      = float(enrollment.get("skill_score", 100))
            c_id       = str(enrollment.get("course_id", ""))

            # Determine status
            if score <= CRITICAL_THRESHOLD:
                status = "critical"
            elif score <= RECOVERY_TASK_THRESHOLD:
                status = "recovery"
            elif score <= 65:
                status = "watch"
            else:
                continue   # healthy — skip unless filter=all

            if filter_by != "all" and status != filter_by:
                continue

            course_doc  = db.courses.find_one({"_id": oid(c_id)}, {"name": 1})
            course_name = course_doc.get("name", c_id) if course_doc else c_id

            full_name   = student.get("profile", {}).get("full_name", "")
            email       = student.get("email", "")

            if search and search.lower() not in full_name.lower() and search.lower() not in email.lower():
                continue

            # Pending recovery tasks for this student + course
            pending = db.task_assignments.count_documents({
                "user_id":     s_uid,
                "course_id":   c_id,
                "is_recovery": True,
                "status":      "pending",
            })

            # Last test session
            last_session = db.test_sessions.find_one(
                {"user_id": s_uid, "course_id": c_id, "completed": True},
                sort=[("submitted_at", -1)],
            )
            last_active = None
            days_inactive = 0
            if last_session:
                la = last_session.get("submitted_at")
                if la:
                    if isinstance(la, str):
                        la = datetime.fromisoformat(la)
                    last_active   = la.isoformat()
                    days_inactive = (datetime.utcnow() - la.replace(tzinfo=None)).days

            weak_topics = _get_weak_topics(db, s_uid, c_id)

            rows.append({
                "user_id":      s_uid,
                "full_name":    full_name,
                "email":        email,
                "course_id":    c_id,
                "course_name":  course_name,
                "skill_score":  round(score, 1),
                "status":       status,
                "current_day":  enrollment.get("current_day", 1),
                "streak":       student.get("profile", {}).get("current_streak", 0),
                "days_inactive": days_inactive,
                "last_active":  last_active,
                "pending_recovery_tasks": pending,
                "weak_topics":  weak_topics,
            })

    # Sort: critical first, then by score ascending
    STATUS_ORDER = {"critical": 0, "recovery": 1, "watch": 2}
    rows.sort(key=lambda r: (STATUS_ORDER.get(r["status"], 9), r["skill_score"]))

    total_count = len(rows)
    paginated   = rows[skip: skip + limit]

    return jsonify({
        "students":    paginated,
        "total":       total_count,
        "page":        page,
        "pages":       max(1, (total_count + limit - 1) // limit),
        "filter":      filter_by,
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# SINGLE STUDENT DETAIL
# ─────────────────────────────────────────────────────────────────────────────

@admin_recovery_bp.route("/students/<student_id>", methods=["GET"])
@jwt_required()
def student_recovery_detail(student_id):
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db      = get_db()
    student = db.users.find_one({"_id": oid(student_id)}, {"password_hash": 0})
    if not student:
        return jsonify({"error": "Student not found"}), 404

    s_uid   = str(student["_id"])
    result  = {"student": serialize(student), "courses": []}

    for enrollment in student.get("profile", {}).get("courses", []):
        c_id       = str(enrollment.get("course_id", ""))
        score      = float(enrollment.get("skill_score", 100))
        course_doc = db.courses.find_one({"_id": oid(c_id)}, {"name": 1})

        # Last 10 test sessions
        sessions = list(db.test_sessions.find(
            {"user_id": s_uid, "course_id": c_id, "completed": True},
            sort=[("submitted_at", -1)],
            limit=10,
        ))

        # All recovery assignments
        assignments = list(db.task_assignments.find(
            {"user_id": s_uid, "course_id": c_id, "is_recovery": True},
            sort=[("assigned_at", -1)],
            limit=20,
        ))

        # Decay logs
        decay_logs = list(db.skill_decay_logs.find(
            {"user_id": s_uid, "course_id": c_id},
            sort=[("logged_at", -1)],
            limit=10,
        ))

        result["courses"].append({
            "course_id":   c_id,
            "course_name": course_doc.get("name", c_id) if course_doc else c_id,
            "skill_score": round(score, 1),
            "current_day": enrollment.get("current_day", 1),
            "status": (
                "critical" if score <= CRITICAL_THRESHOLD
                else "recovery" if score <= RECOVERY_TASK_THRESHOLD
                else "watch" if score <= 65
                else "healthy"
            ),
            "weak_topics":   _get_weak_topics(db, s_uid, c_id),
            "sessions":      [serialize(s) for s in sessions],
            "assignments":   [serialize(a) for a in assignments],
            "decay_logs":    [serialize(d) for d in decay_logs],
        })

    return jsonify(result), 200


# ─────────────────────────────────────────────────────────────────────────────
# MANUALLY ASSIGN RECOVERY TASKS
# ─────────────────────────────────────────────────────────────────────────────

@admin_recovery_bp.route("/assign/<student_id>", methods=["POST"])
@jwt_required()
def manual_assign_recovery(student_id):
    """
    Body: { "course_id": "...", "note": "optional message to student" }
    Manually triggers _assign_recovery_tasks() for a student.
    """
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db   = get_db()
    body = request.get_json(force=True) or {}
    c_id = body.get("course_id", "")
    note = body.get("note", "")

    student = db.users.find_one({"_id": oid(student_id)})
    if not student:
        return jsonify({"error": "Student not found"}), 404

    score = 100.0
    for c in student.get("profile", {}).get("courses", []):
        if str(c.get("course_id")) == str(c_id):
            score = float(c.get("skill_score", 100))
            break

    _assign_recovery_tasks(db, student_id, c_id, score)

    if note:
        db.notifications.insert_one(make_notification(
            user_id    = student_id,
            title      = "Recovery tasks assigned by admin",
            message    = note,
            notif_type = "recovery",
        ))

    return jsonify({"message": "Recovery tasks assigned", "score": score}), 200


# ─────────────────────────────────────────────────────────────────────────────
# TASK COVERAGE — which topics have recovery tasks available
# ─────────────────────────────────────────────────────────────────────────────

@admin_recovery_bp.route("/tasks/coverage", methods=["GET"])
@jwt_required()
def recovery_task_coverage():
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db        = get_db()
    course_id = request.args.get("course_id", "")

    query = {"is_recovery": True, "status": "approved"}
    if course_id:
        query["course_id"] = course_id

    recovery_tasks = list(db.tasks.find(query, {"topic": 1, "difficulty": 1, "course_id": 1}))

    by_topic = {}
    for t in recovery_tasks:
        topic = t.get("topic", "Unknown")
        diff  = t.get("difficulty", "beginner")
        if topic not in by_topic:
            by_topic[topic] = {"topic": topic, "count": 0, "difficulties": set()}
        by_topic[topic]["count"]        += 1
        by_topic[topic]["difficulties"].add(diff)

    coverage = [
        {**v, "difficulties": sorted(v["difficulties"])}
        for v in by_topic.values()
    ]
    coverage.sort(key=lambda x: x["count"], reverse=True)

    return jsonify({
        "coverage":      coverage,
        "total_topics":  len(coverage),
        "total_tasks":   len(recovery_tasks),
        "has_coverage":  len(coverage) > 0,
    }), 200