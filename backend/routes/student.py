"""
routes/student.py — SkillTrack v4 Student Routes

FIXED: Added /check-unlock endpoint so frontend can trigger unlock
when countdown timer reaches zero, without waiting for midnight scheduler.

Three-zone skill score pipeline after submit_test:
  < 40%   → apply_failure_decay
  40–59%  → neutral zone
  >= 60%  → apply_recovery_bonus
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_db
from models import serialize, oid, make_performance, make_notification
from datetime import datetime, date

student_bp = Blueprint("student", __name__)

from services.skill_engine import RECOVERY_UI_THRESHOLD


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_user(uid):
    return get_db().users.find_one({"_id": oid(uid)})


def _current_day(user: dict, course_id: str) -> int:
    for c in (user.get("profile") or {}).get("courses", []):
        if str(c.get("course_id")) == str(course_id):
            return int(c.get("current_day", 1))
    return 1


def _skill_score_for_course(user: dict, course_id: str) -> float:
    for c in (user.get("profile") or {}).get("courses", []):
        if str(c.get("course_id")) == str(course_id):
            return float(c.get("skill_score", 100))
    return 100.0


def _save_skill_score(db, uid: str, course_id: str, new_score: float):
    db.users.update_one(
        {"_id": oid(uid), "profile.courses.course_id": str(course_id)},
        {"$set": {"profile.courses.$.skill_score": round(new_score, 1)}}
    )


def _get_course_score_from_db(db, uid: str, course_id: str) -> float:
    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return 100.0
    for c in (user.get("profile") or {}).get("courses", []):
        if str(c.get("course_id")) == str(course_id):
            return float(c.get("skill_score", 100))
    return 100.0


def _get_pending_days(db, uid: str, course_id: str, current_day: int) -> list:
    pending = []
    for day in range(1, current_day + 1):
        has_tasks = db.tasks.count_documents({
            "course_id":       course_id,
            "status":          "approved",
            "day_range_start": day,
            "day_range_end":   day,
        })
        if not has_tasks:
            continue
        done = db.test_sessions.find_one({
            "user_id":   str(uid),
            "course_id": course_id,
            "day":       day,
            "completed": True,
        })
        if not done:
            pending.append(day)
    return pending


def _score_answer(task: dict, answer_given: str, hints_used: int = 0):
    task_type  = task.get("task_type", "mcq")
    is_correct = False
    score      = 0

    if task_type == "mcq":
        correct    = (task.get("solution") or "").strip().upper()
        given      = (answer_given or "").strip().upper()
        is_correct = bool(correct and given and correct[0] == given[0])
        score      = 100 if is_correct else 0

    elif task_type == "debug":
        try:
            s          = max(0, min(100, int((answer_given or "0").strip())))
            is_correct = s >= 80
            score      = s
        except (ValueError, AttributeError):
            pass

    elif task_type == "coding":
        try:
            s          = max(0, min(100, int((answer_given or "0").strip())))
            is_correct = s >= 70
            score      = s
        except (ValueError, AttributeError):
            pass

    elif task_type == "theory":
        words      = len((answer_given or "").strip().split())
        is_correct = words >= 30
        score      = min(100, words) if is_correct else 0

    base_xp   = task.get("xp_reward", 10)
    xp_earned = max(base_xp - hints_used * 2, 1) if is_correct else 0
    return is_correct, score, xp_earned


def _skill_label(score: float) -> dict:
    if score >= 85: return {"label": "Expert",         "color": "emerald"}
    if score >= 70: return {"label": "Proficient",     "color": "blue"}
    if score >= 55: return {"label": "Developing",     "color": "yellow"}
    if score >= 40: return {"label": "Needs Practice", "color": "orange"}
    return               {"label": "Struggling",       "color": "rose"}


def _update_streak(db, uid: str):
    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return
    profile        = user.get("profile", {})
    current_streak = int(profile.get("current_streak", 0))
    longest_streak = int(profile.get("longest_streak", 0))
    new_streak     = current_streak + 1
    db.users.update_one({"_id": oid(uid)}, {"$set": {
        "profile.current_streak": new_streak,
        "profile.longest_streak": max(longest_streak, new_streak),
    }})


def _get_user_email_info(db, uid: str):
    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return "", ""
    return user.get("email", ""), user.get("profile", {}).get("full_name", "")


# ── Daily Test — GET ───────────────────────────────────────────────────────────

@student_bp.route("/daily-test", methods=["GET"])
@jwt_required()
def daily_test():
    uid       = get_jwt_identity()
    course_id = request.args.get("course_id", "").strip()
    day_param = request.args.get("day", None)

    if not course_id:
        return jsonify({"error": "course_id required"}), 400

    db   = get_db()
    user = _get_user(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    current_day = _current_day(user, course_id)
    skill_score = _skill_score_for_course(user, course_id)

    try:
        target_day = int(day_param) if day_param else current_day
    except (ValueError, TypeError):
        target_day = current_day

    if target_day > current_day:
        return jsonify({
            "status":  "locked",
            "day":     target_day,
            "message": f"Day {target_day} is not unlocked yet. You're on Day {current_day}.",
        }), 200

    already_done = db.test_sessions.find_one({
        "user_id":   str(uid),
        "course_id": course_id,
        "day":       target_day,
        "completed": True,
    })
    if already_done:
        return jsonify({
            "status":    "completed",
            "day":       target_day,
            "score":     already_done.get("percent", 0),
            "xp_earned": already_done.get("total_xp", 0),
            "correct":   already_done.get("correct", 0),
            "total":     already_done.get("total", 0),
            "message":   f"You already completed Day {target_day}'s test!",
        }), 200

    from services.task_engine import get_daily_tasks, get_phase_info

    tasks = get_daily_tasks(db, course_id, target_day, skill_score, uid=uid)
    phase_info = get_phase_info(target_day, skill_score)

    if not tasks:
        return jsonify({
            "status":     "locked",
            "day":        target_day,
            "message":    f"No tasks available for Day {target_day} yet. Check back after the admin publishes them.",
            "phase_info": phase_info,
        }), 200

    return jsonify({
        "status":     "ready",
        "day":        target_day,
        "tasks":      [serialize(t) for t in tasks],
        "total":      len(tasks),
        "phase_info": phase_info,
    }), 200


# ── Submit Test — POST ─────────────────────────────────────────────────────────

@student_bp.route("/submit-test", methods=["POST"])
@jwt_required()
def submit_test():
    uid  = get_jwt_identity()
    db   = get_db()
    data = request.get_json(force=True)

    course_id        = data.get("course_id", "")
    day              = int(data.get("day", 1))
    answers          = data.get("answers", [])
    started_at_iso   = data.get("started_at")
    submitted_at_iso = data.get("submitted_at")
    duration_seconds = data.get("duration_seconds", 0)

    if not course_id or not answers:
        return jsonify({"error": "course_id and answers required"}), 400

    user = _get_user(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    already = db.test_sessions.find_one({
        "user_id":   str(uid),
        "course_id": course_id,
        "day":       day,
        "completed": True,
    })
    if already:
        return jsonify({"error": "Already submitted this test", "already_done": True}), 409

    # ── Score each answer ──────────────────────────────────────────────────────
    results    = []
    total_xp   = 0
    correct_ct = 0

    for ans in answers:
        task_id      = ans.get("task_id", "")
        answer_given = ans.get("answer_given", "")
        hints_used   = int(ans.get("hints_used", 0))
        time_taken   = int(ans.get("time_taken", 0))

        task = db.tasks.find_one({"_id": oid(task_id)})
        if not task:
            continue

        is_correct, score, xp_earned = _score_answer(task, answer_given, hints_used)
        if is_correct:
            correct_ct += 1
            total_xp   += xp_earned

        db.performances.insert_one(make_performance(
            user_id=uid, task_id=task_id, assignment_id=task_id,
            course_id=course_id, score=score, is_correct=is_correct,
            time_taken=time_taken, answer_given=answer_given,
            hints_used=hints_used, xp_earned=xp_earned,
        ))

        results.append({
            "task_id":     task_id,
            "task_type":   task.get("task_type"),
            "title":       task.get("title"),
            "is_correct":  is_correct,
            "score":       score,
            "xp_earned":   xp_earned,
            "solution":    task.get("solution", ""),
            "explanation": task.get("explanation", ""),
        })

    total_q = len(results)
    percent  = round((correct_ct / total_q) * 100) if total_q else 0

    # ── Save test session ──────────────────────────────────────────────────────
    db.test_sessions.insert_one({
        "user_id":          str(uid),
        "course_id":        course_id,
        "day":              day,
        "completed":        True,
        "correct":          correct_ct,
        "total":            total_q,
        "percent":          percent,
        "total_xp":         total_xp,
        "started_at":       started_at_iso,
        "submitted_at":     submitted_at_iso or datetime.utcnow().isoformat(),
        "duration_seconds": duration_seconds,
        "created_at":       datetime.utcnow(),
    })

    if total_xp > 0:
        db.users.update_one({"_id": oid(uid)}, {"$inc": {"profile.total_xp": total_xp}})

    _update_streak(db, uid)

    # ── Skill score pipeline ───────────────────────────────────────────────────
    from services.skill_engine import (
        compute_skill_score,
        apply_failure_decay,
        apply_recovery_bonus,
    )

    old_skill_score = _get_course_score_from_db(db, uid, course_id)
    new_skill_score = compute_skill_score(db, uid, course_id)

    if percent < 40:
        try:
            decayed = apply_failure_decay(db, uid, course_id, percent)
            if decayed is not None:
                new_skill_score = decayed
            else:
                _save_skill_score(db, uid, course_id, new_skill_score)
        except Exception as e:
            print(f"[SKILL] Failure decay error: {e}")
            _save_skill_score(db, uid, course_id, new_skill_score)

    elif percent >= 60:
        try:
            recovered = apply_recovery_bonus(db, uid, course_id, percent)
            if recovered is not None:
                new_skill_score = recovered
            else:
                _save_skill_score(db, uid, course_id, new_skill_score)
        except Exception as e:
            print(f"[SKILL] Recovery bonus error: {e}")
            _save_skill_score(db, uid, course_id, new_skill_score)

    else:
        _save_skill_score(db, uid, course_id, new_skill_score)

    new_skill_score = _get_course_score_from_db(db, uid, course_id)

    # ── Day advance ────────────────────────────────────────────────────────────
    try:
        from utils.assignment import advance_student_day
        advance_student_day(db, uid, course_id, day, percent)
    except Exception as e:
        print(f"[DAY] advance_student_day error (non-fatal): {e}")

    in_recovery  = new_skill_score < RECOVERY_UI_THRESHOLD
    updated_user = db.users.find_one({"_id": oid(uid)})
    consec_fails = (updated_user.get("consec_fails") or {}).get(course_id, 0) if updated_user else 0

    # ── In-app notification ────────────────────────────────────────────────────
    db.notifications.insert_one(make_notification(
        user_id    = uid,
        title      = f"Day {day} test submitted!",
        message    = (f"Score: {correct_ct}/{total_q} ({percent}%) • "
                      f"+{total_xp} XP • Skill: {new_skill_score}"),
        notif_type = "success" if percent >= 60 else "info",
    ))

    # ── Email: test completed ──────────────────────────────────────────────────
    try:
        email, full_name = _get_user_email_info(db, uid)
        course      = db.courses.find_one({"_id": oid(course_id)})
        course_name = course.get("name", "your course") if course else "your course"
        streak      = (updated_user.get("profile", {}).get("current_streak", 0) if updated_user else 0)
        level       = (updated_user.get("profile", {}).get("level", 1) if updated_user else 1)
        if email:
            from services.email_service import send_test_completed_email
            send_test_completed_email(
                db=db, user_id=uid, to_email=email, full_name=full_name,
                course_name=course_name, day=day, correct=correct_ct,
                total=total_q, percent=percent, xp_earned=total_xp,
                skill_score=new_skill_score, passed=(percent >= 60),
                streak=streak, level=level, results=results,
            )
    except Exception as e:
        print(f"[STUDENT] Test completed email error (non-fatal): {e}")

    # ── Email: skill change ────────────────────────────────────────────────────
    try:
        email, full_name = _get_user_email_info(db, uid)
        course      = db.courses.find_one({"_id": oid(course_id)})
        course_name = course.get("name", "your course") if course else "your course"
        drop = old_skill_score - new_skill_score
        if drop >= 5 and email:
            from services.email_service import send_skill_decay_email
            send_skill_decay_email(
                db=db, user_id=uid, to_email=email, full_name=full_name,
                course_name=course_name, old_score=old_skill_score,
                new_score=new_skill_score, decay_type="failure_decay",
                decay_amount=drop
            )
        elif new_skill_score > old_skill_score + 3 and email:
            from services.email_service import send_skill_recovery_email
            send_skill_recovery_email(
                db=db, user_id=uid, to_email=email, full_name=full_name,
                course_name=course_name, old_score=old_skill_score,
                new_score=new_skill_score
            )
    except Exception as e:
        print(f"[STUDENT] Skill change email error (non-fatal): {e}")

    return jsonify({
        "results":          results,
        "correct":          correct_ct,
        "total":            total_q,
        "percent":          percent,
        "total_xp_earned":  total_xp,
        "passed":           percent >= 60,
        "new_skill_score":  new_skill_score,
        "in_recovery":      in_recovery,
        "consec_fails":     consec_fails,
        "skill_label":      _skill_label(new_skill_score),
        "message":          f"Day {day} submitted! Score: {percent}%",
        "duration_seconds": duration_seconds,
    }), 200


# ── CHECK UNLOCK — POST (NEW) ──────────────────────────────────────────────────

@student_bp.route("/check-unlock", methods=["POST"])
@jwt_required()
def check_unlock():
    """
    NEW ENDPOINT: Called by frontend when countdown timer reaches zero.
    Runs the midnight unlock logic for this user immediately so they don't
    have to wait for the next scheduled midnight job run.

    Returns:
        { unlocked: int, message: str, refreshed_courses: list }
    """
    uid = get_jwt_identity()
    db  = get_db()

    from utils.assignment import midnight_unlock_job_for_user
    unlocked = midnight_unlock_job_for_user(db, uid)

    # Return updated course data so frontend can refresh without full page reload
    user = db.users.find_one({"_id": oid(uid)})
    courses_out = []
    if user:
        from datetime import timedelta
        profile  = user.get("profile", {})
        enrolled = profile.get("courses", [])
        for enrollment in enrolled:
            cid    = str(enrollment.get("course_id", ""))
            course = db.courses.find_one({"_id": oid(cid)})
            if not course:
                continue
            current_day  = int(enrollment.get("current_day", 1))
            skill_score  = float(enrollment.get("skill_score", 100))
            pending_unlock = enrollment.get("pending_unlock", False)

            now              = datetime.utcnow()
            midnight         = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            secs_to_midnight = int((midnight - now).total_seconds())

            courses_out.append({
                "course_id":       cid,
                "course_name":     course.get("name", ""),
                "current_day":     current_day,
                "skill_score":     skill_score,
                "pending_unlock":  pending_unlock,
                "cooldown_active": pending_unlock,
                "seconds_remaining": secs_to_midnight,
            })

    return jsonify({
        "unlocked":         unlocked,
        "message":          f"{unlocked} day(s) unlocked" if unlocked else "No days ready to unlock yet",
        "refreshed_courses": courses_out,
    }), 200


# ── Skill Breakdown ────────────────────────────────────────────────────────────

@student_bp.route("/skill-breakdown/<course_id>", methods=["GET"])
@jwt_required()
def skill_breakdown(course_id):
    uid = get_jwt_identity()
    db  = get_db()
    from services.skill_engine import get_skill_breakdown
    data = get_skill_breakdown(db, uid, course_id)
    return jsonify(data), 200


# ── Dashboard ──────────────────────────────────────────────────────────────────

@student_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    uid  = get_jwt_identity()
    db   = get_db()
    user = _get_user(uid)
    if not user:
        return jsonify({"error": "Not found"}), 404

    profile  = user.get("profile", {})
    enrolled = profile.get("courses", [])

    courses_out = []
    for enrollment in enrolled:
        cid    = str(enrollment.get("course_id", ""))
        course = db.courses.find_one({"_id": oid(cid)})
        if not course:
            continue

        current_day     = int(enrollment.get("current_day", 1))
        skill_score     = float(enrollment.get("skill_score", 100))
        pending_days    = _get_pending_days(db, uid, cid, current_day)
        in_recovery     = skill_score < RECOVERY_UI_THRESHOLD
        consec_fails    = (user.get("consec_fails") or {}).get(cid, 0)
        completed_count = db.test_sessions.count_documents({
            "user_id": str(uid), "course_id": cid, "completed": True,
        })

        pending_unlock  = enrollment.get("pending_unlock", False)
        passed_day_num  = enrollment.get("passed_day_num", None)
        next_day        = (passed_day_num + 1) if passed_day_num else current_day + 1
        cooldown_active = pending_unlock

        from datetime import timedelta
        now              = datetime.utcnow()
        midnight         = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        secs_to_midnight = int((midnight - now).total_seconds())

        # FIXED: Calculate actual IST midnight seconds remaining
        from utils.assignment import seconds_until_ist_midnight
        secs_to_midnight = seconds_until_ist_midnight()

        from services.task_engine import get_phase_info
        phase_info = get_phase_info(current_day, skill_score)

        courses_out.append({
            "course_id":         cid,
            "course_name":       course.get("name", ""),
            "course_icon":       course.get("icon", "💻"),
            "course_color":      course.get("color", "#6366f1"),
            "current_day":       current_day,
            "skill_score":       skill_score,
            "skill_status":      _skill_label(skill_score),
            "in_recovery":       in_recovery,
            "consec_fails":      consec_fails,
            "test_ready":        True,
            "test_done":         len(pending_days) == 0,
            "pending_days":      pending_days,
            "pending_count":     len(pending_days),
            "completed_count":   completed_count,
            "pending_unlock":    pending_unlock,
            "cooldown_active":   cooldown_active,
            "passed_day":        passed_day_num,
            "next_day":          next_day,
            "seconds_remaining": secs_to_midnight,
            "phase_info":        phase_info,
        })

    recent = list(db.performances.find(
        {"user_id": str(uid)},
        sort=[("submitted_at", -1)],
        limit=10,
    ))
    for p in recent:
        task      = db.tasks.find_one({"_id": oid(p.get("task_id", ""))})
        p["task"] = serialize(task) if task else {}

    notif_count = db.notifications.count_documents({"user_id": str(uid), "is_read": False})

    return jsonify({
        "profile":             {**serialize(profile), "email": user.get("email", "")},
        "courses":             courses_out,
        "recent_activity":     [serialize(p) for p in recent],
        "notifications_count": notif_count,
    }), 200


# ── Profile Setup ──────────────────────────────────────────────────────────────

@student_bp.route("/profile/setup", methods=["POST"])
@jwt_required()
def profile_setup():
    uid  = get_jwt_identity()
    db   = get_db()
    data = request.get_json(force=True)

    course_ids = data.get("course_ids", [])
    if not course_ids:
        return jsonify({"error": "Select at least one course"}), 400

    enrolled = []
    for cid in course_ids:
        course = db.courses.find_one({"_id": oid(cid)})
        if course:
            enrolled.append({
                "course_id":   str(course["_id"]),
                "course_name": course.get("name", ""),
                "current_day": 1,
                "skill_score": 100,
                "enrolled_at": datetime.utcnow().isoformat(),
            })

    db.users.update_one({"_id": oid(uid)}, {"$set": {
        "profile.full_name":         data.get("full_name",     ""),
        "profile.gender":            data.get("gender",        ""),
        "profile.phone":             data.get("phone",         ""),
        "profile.education":         data.get("education",     ""),
        "profile.bio":               data.get("bio",           ""),
        "profile.date_of_birth":     data.get("date_of_birth", ""),
        "profile.courses":           enrolled,
        "profile.profile_completed": True,
    }})

    user = db.users.find_one({"_id": oid(uid)})

    try:
        full_name = data.get("full_name", "")
        email     = user.get("email", "")
        if email and full_name:
            from services.email_service import send_welcome_email
            send_welcome_email(db, uid, email, full_name)
    except Exception as e:
        print(f"[STUDENT] Profile setup welcome email error (non-fatal): {e}")

    from models import user_to_dict
    return jsonify({"message": "Profile setup complete", "user": user_to_dict(user)}), 200


# ── Profile Update ─────────────────────────────────────────────────────────────

@student_bp.route("/profile/update", methods=["PUT"])
@jwt_required()
def profile_update():
    uid  = get_jwt_identity()
    db   = get_db()
    data = request.get_json(force=True)

    allowed = ["full_name", "gender", "phone", "education", "bio", "date_of_birth", "avatar_url"]
    update  = {f"profile.{k}": data[k] for k in allowed if k in data}

    if not update:
        return jsonify({"error": "Nothing to update"}), 400

    db.users.update_one({"_id": oid(uid)}, {"$set": update})
    user = db.users.find_one({"_id": oid(uid)})
    from models import user_to_dict
    return jsonify({"message": "Profile updated", "user": user_to_dict(user)}), 200


# ── Notifications ──────────────────────────────────────────────────────────────

@student_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    uid    = get_jwt_identity()
    db     = get_db()
    page   = request.args.get("page", 1, type=int)
    limit  = request.args.get("limit", 20, type=int)
    notifs = list(db.notifications.find(
        {"user_id": str(uid)},
        sort=[("created_at", -1)],
        skip=(page - 1) * limit,
        limit=limit,
    ))
    total  = db.notifications.count_documents({"user_id": str(uid)})
    unread = db.notifications.count_documents({"user_id": str(uid), "is_read": False})
    return jsonify({
        "notifications": [serialize(n) for n in notifs],
        "total":  total,
        "unread": unread,
    }), 200


@student_bp.route("/notifications/read", methods=["POST"])
@jwt_required()
def mark_notifications_read():
    uid      = get_jwt_identity()
    db       = get_db()
    body     = request.get_json(force=True, silent=True) or {}
    specific = body.get("id")
    if specific:
        db.notifications.update_one(
            {"_id": oid(specific), "user_id": str(uid)},
            {"$set": {"is_read": True}}
        )
    else:
        db.notifications.update_many(
            {"user_id": str(uid), "is_read": False},
            {"$set": {"is_read": True}}
        )
    return jsonify({"message": "Marked as read"}), 200


@student_bp.route("/notifications/<notif_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notif_id):
    uid = get_jwt_identity()
    db  = get_db()
    db.notifications.delete_one({"_id": oid(notif_id), "user_id": str(uid)})
    return jsonify({"message": "Deleted"}), 200


# ── Analytics ──────────────────────────────────────────────────────────────────

@student_bp.route("/analytics/<course_id>", methods=["GET"])
@jwt_required()
def analytics(course_id):
    uid   = get_jwt_identity()
    db    = get_db()
    perfs = list(db.performances.find({"user_id": str(uid), "course_id": str(course_id)}))

    if not perfs:
        return jsonify({"message": "No data yet"}), 200

    total    = len(perfs)
    correct  = sum(1 for p in perfs if p.get("is_correct"))
    accuracy = round((correct / total) * 100) if total else 0
    avg_time = round(sum(p.get("time_taken", 0) for p in perfs) / total) if total else 0

    type_stats = {}
    for p in perfs:
        task = db.tasks.find_one({"_id": oid(p.get("task_id", ""))})
        if task:
            tt = task.get("task_type", "mcq")
            if tt not in type_stats:
                type_stats[tt] = {"correct": 0, "total": 0}
            type_stats[tt]["total"] += 1
            if p.get("is_correct"):
                type_stats[tt]["correct"] += 1

    topic_map = {}
    for p in perfs:
        task = db.tasks.find_one({"_id": oid(p.get("task_id", ""))})
        if task:
            topic = task.get("topic", "Unknown")
            if topic not in topic_map:
                topic_map[topic] = {"correct": 0, "total": 0}
            topic_map[topic]["total"] += 1
            if p.get("is_correct"):
                topic_map[topic]["correct"] += 1

    weak_topics = [
        {"topic": t, "accuracy": round((v["correct"] / v["total"]) * 100), "attempts": v["total"]}
        for t, v in topic_map.items()
        if v["total"] >= 2 and round((v["correct"] / v["total"]) * 100) < 60
    ]
    weak_topics.sort(key=lambda x: x["accuracy"])

    from collections import defaultdict
    daily = defaultdict(lambda: {"correct": 0, "total": 0})
    for p in perfs:
        submitted = p.get("submitted_at")
        if submitted:
            day_key = (submitted.strftime("%Y-%m-%d") if hasattr(submitted, "strftime")
                       else str(submitted)[:10])
            daily[day_key]["total"] += 1
            if p.get("is_correct"):
                daily[day_key]["correct"] += 1

    trend = [
        {"date": d, "accuracy": round((v["correct"] / v["total"]) * 100) if v["total"] else 0}
        for d, v in sorted(daily.items())
    ][-14:]

    sessions = list(db.test_sessions.find(
        {"user_id": str(uid), "course_id": str(course_id), "completed": True},
        sort=[("submitted_at", -1)],
        limit=14
    ))
    session_trend = [
        {
            "day":              s["day"],
            "percent":          s["percent"],
            "xp":               s.get("total_xp", 0),
            "duration_seconds": s.get("duration_seconds", 0),
        }
        for s in reversed(sessions)
    ]

    from services.skill_engine import get_skill_breakdown
    breakdown = get_skill_breakdown(db, uid, course_id)

    return jsonify({
        "total_tasks":     total,
        "accuracy":        accuracy,
        "avg_time":        avg_time,
        "type_stats":      type_stats,
        "weak_topics":     weak_topics[:5],
        "trend":           trend,
        "session_trend":   session_trend,
        "skill_breakdown": breakdown,
    }), 200


# ── Leaderboard ────────────────────────────────────────────────────────────────

@student_bp.route("/leaderboard", methods=["GET"])
@jwt_required()
def leaderboard():
    db       = get_db()
    students = list(db.users.find(
        {"role": "student", "is_active": True},
        sort=[("profile.total_xp", -1)],
        limit=50,
    ))
    uid = get_jwt_identity()
    result = []
    for rank, s in enumerate(students, 1):
        profile = s.get("profile", {})
        result.append({
            "rank":   rank,
            "name":   profile.get("full_name", "Anonymous"),
            "xp":     profile.get("total_xp", 0),
            "level":  profile.get("level", 1),
            "streak": profile.get("current_streak", 0),
            "is_me":  str(s["_id"]) == str(uid),
        })
    return jsonify(result), 200


# ── Enroll ─────────────────────────────────────────────────────────────────────

@student_bp.route("/enroll", methods=["POST"])
@jwt_required()
def enroll():
    uid       = get_jwt_identity()
    db        = get_db()
    data      = request.get_json(force=True)
    course_id = data.get("course_id", "")

    if not course_id:
        return jsonify({"error": "course_id required"}), 400

    user   = _get_user(uid)
    course = db.courses.find_one({"_id": oid(course_id)})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    enrolled = user.get("profile", {}).get("courses", [])
    if any(str(c.get("course_id")) == str(course_id) for c in enrolled):
        return jsonify({"error": "Already enrolled"}), 409

    db.users.update_one({"_id": oid(uid)}, {"$push": {"profile.courses": {
        "course_id":   str(course["_id"]),
        "course_name": course.get("name", ""),
        "current_day": 1,
        "skill_score": 100,
        "enrolled_at": datetime.utcnow().isoformat(),
    }}})

    db.notifications.insert_one(make_notification(
        uid,
        f"Enrolled in {course.get('name')}!",
        "You're now enrolled. Start your Day 1 test to begin your journey!",
        "success"
    ))

    return jsonify({"message": f"Enrolled in {course.get('name')}"}), 200