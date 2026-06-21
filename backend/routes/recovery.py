"""
routes/recovery.py  —  Recovery Task Routes
============================================
New blueprint — register in app.py as:
    from routes.recovery import recovery_bp
    app.register_blueprint(recovery_bp, url_prefix="/api/recovery")

Endpoints:
  GET  /api/recovery/tasks/<course_id>        — fetch pending recovery tasks
  POST /api/recovery/tasks/<assignment_id>/submit  — submit a recovery task
  GET  /api/recovery/status/<course_id>       — recovery status for dashboard
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from db import get_db
from models import serialize, oid, make_notification

recovery_bp = Blueprint("recovery", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# GET — fetch pending recovery tasks for a course
# ─────────────────────────────────────────────────────────────────────────────

@recovery_bp.route("/tasks/<course_id>", methods=["GET"])
@jwt_required()
def get_recovery_tasks(course_id):
    """
    Returns all pending recovery task assignments for this student + course.
    Each assignment includes the full task content.
    """
    uid = get_jwt_identity()
    db  = get_db()

    assignments = list(db.task_assignments.find({
        "user_id":     uid,
        "course_id":   course_id,
        "is_recovery": True,
        "status":      "pending",
    }).sort("assigned_at", 1))

    if not assignments:
        return jsonify({"recovery_tasks": [], "count": 0}), 200

    # Attach full task content to each assignment
    result = []
    for assignment in assignments:
        task = db.tasks.find_one({"_id": oid(assignment["task_id"])})
        if not task:
            continue
        entry             = serialize(assignment)
        entry["task"]     = serialize(task)
        entry["due_date"] = assignment.get("assigned_date", "")
        result.append(entry)

    return jsonify({"recovery_tasks": result, "count": len(result)}), 200


# ─────────────────────────────────────────────────────────────────────────────
# POST — submit answers for a recovery task
# ─────────────────────────────────────────────────────────────────────────────

@recovery_bp.route("/tasks/<assignment_id>/submit", methods=["POST"])
@jwt_required()
def submit_recovery_task(assignment_id):
    """
    Body:
      {
        "answers":       { "task_id": "user_answer", ... } or a single answer string,
        "time_taken":    120   (seconds),
        "course_id":     "..."
      }

    Marks the assignment complete, records performance,
    and applies a recovery bonus to skill score.
    """
    uid  = get_jwt_identity()
    db   = get_db()
    body = request.get_json(force=True) or {}

    assignment = db.task_assignments.find_one({
        "_id":         oid(assignment_id),
        "user_id":     uid,
        "is_recovery": True,
        "status":      "pending",
    })
    if not assignment:
        return jsonify({"error": "Recovery assignment not found or already completed"}), 404

    task = db.tasks.find_one({"_id": oid(assignment["task_id"])})
    if not task:
        return jsonify({"error": "Task not found"}), 404

    course_id  = assignment["course_id"]
    answers    = body.get("answers", {})
    time_taken = int(body.get("time_taken", 0))

    # ── Score the answer ──────────────────────────────────────────────────
    is_correct, score = _score_recovery_answer(task, answers)

    # ── Mark assignment complete ──────────────────────────────────────────
    db.task_assignments.update_one(
        {"_id": oid(assignment_id)},
        {"$set": {
            "status":       "completed",
            "is_correct":   is_correct,
            "score":        score,
            "completed_at": datetime.utcnow(),
        }}
    )

    # ── Record performance ────────────────────────────────────────────────
    db.performances.insert_one({
        "user_id":       uid,
        "task_id":       str(task["_id"]),
        "assignment_id": str(assignment["_id"]),
        "course_id":     course_id,
        "score":         score,
        "is_correct":    is_correct,
        "time_taken":    time_taken,
        "answer_given":  str(answers),
        "hints_used":    0,
        "xp_earned":     task.get("xp_reward", 10) if is_correct else 0,
        "is_recovery":   True,
        "submitted_at":  datetime.utcnow(),
    })

    # ── Apply recovery bonus to skill score ───────────────────────────────
    new_score = None
    if is_correct:
        new_score = _apply_recovery_task_bonus(db, uid, course_id, score, task)

    # ── Check if all recovery tasks for today are done ────────────────────
    pending_count = db.task_assignments.count_documents({
        "user_id":     uid,
        "course_id":   course_id,
        "is_recovery": True,
        "status":      "pending",
    })

    if pending_count == 0:
        db.notifications.insert_one(make_notification(
            user_id=uid,
            title="Recovery tasks complete! 🎉",
            message="You've completed all your recovery tasks. Keep practicing to stay strong!",
            notif_type="success",
        ))

    return jsonify({
        "is_correct":           is_correct,
        "score":                score,
        "new_skill_score":      new_score,
        "remaining_recovery_tasks": pending_count,
        "message": "Correct! Recovery bonus applied." if is_correct else "Incorrect. Keep trying!",
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET — recovery status for dashboard widget
# ─────────────────────────────────────────────────────────────────────────────

@recovery_bp.route("/status/<course_id>", methods=["GET"])
@jwt_required()
def get_recovery_status(course_id):
    """
    Returns recovery status for the student dashboard panel:
      - in_recovery: bool
      - skill_score: float
      - pending_tasks: int
      - completed_today: int
      - weak_topics: list
    """
    uid = get_jwt_identity()
    db  = get_db()

    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    skill_score = 100.0
    for c in user.get("profile", {}).get("courses", []):
        if str(c.get("course_id")) == str(course_id):
            skill_score = float(c.get("skill_score", 100.0))
            break

    from services.skill_engine import (
        RECOVERY_TASK_THRESHOLD, RECOVERY_UI_THRESHOLD,
        CRITICAL_THRESHOLD, _get_weak_topics,
    )

    pending_count = db.task_assignments.count_documents({
        "user_id":     uid,
        "course_id":   course_id,
        "is_recovery": True,
        "status":      "pending",
    })

    today = datetime.utcnow().date().isoformat()
    completed_today = db.task_assignments.count_documents({
        "user_id":       uid,
        "course_id":     course_id,
        "is_recovery":   True,
        "status":        "completed",
        "assigned_date": today,
    })

    weak_topics = _get_weak_topics(db, uid, course_id)

    return jsonify({
        "in_recovery":      skill_score < RECOVERY_UI_THRESHOLD,
        "is_critical":      skill_score < CRITICAL_THRESHOLD,
        "skill_score":      skill_score,
        "threshold":        RECOVERY_UI_THRESHOLD,
        "pending_tasks":    pending_count,
        "completed_today":  completed_today,
        "weak_topics":      weak_topics,
        "message": _recovery_message(skill_score, pending_count, RECOVERY_TASK_THRESHOLD, CRITICAL_THRESHOLD),
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _score_recovery_answer(task: dict, answers) -> tuple[bool, float]:
    """
    Score a recovery task answer.
    Supports MCQ (correct_answer field) and theory/debug (manual or heuristic).
    Returns (is_correct: bool, score: float 0-100).
    """
    task_type = task.get("task_type", "mcq")
    content   = task.get("content", {})

    if task_type == "mcq":
        correct_answer = content.get("correct_answer", "")
        if not correct_answer:
            # Try options list
            options = content.get("options", [])
            for opt in options:
                if isinstance(opt, dict) and opt.get("is_correct"):
                    correct_answer = opt.get("text", "")
                    break

        user_answer = answers if isinstance(answers, str) else answers.get("answer", "")
        is_correct  = str(user_answer).strip().lower() == str(correct_answer).strip().lower()
        score       = 100.0 if is_correct else 0.0
        return is_correct, score

    # For coding/debug — mark as correct if submitted (manual review later)
    # In a real system you'd run tests here
    is_correct = bool(answers)
    score      = 70.0 if is_correct else 0.0
    return is_correct, score


def _apply_recovery_task_bonus(
    db, uid: str, course_id: str, score: float, task: dict
) -> float | None:
    """
    Apply a small skill score bonus for completing a recovery task correctly.
    
    Recovery bonus is intentionally small (1–4 pts) because:
    - Recovery should be gradual, not instant
    - Prevents gaming the system by submitting easy recovery tasks repeatedly
    - Real recovery comes from daily test performance
    
    Bonus scale:
      beginner task correct  → +1.0 pt
      intermediate correct   → +2.0 pts
      advanced correct       → +3.0 pts
      expert correct         → +4.0 pts
    """
    difficulty_bonus = {
        "beginner":     1.0,
        "intermediate": 2.0,
        "advanced":     3.0,
        "expert":       4.0,
    }
    bonus = difficulty_bonus.get(task.get("difficulty", "beginner"), 1.0)
    # Partial credit for partial score
    bonus = round(bonus * (score / 100.0), 1)
    if bonus <= 0:
        return None

    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return None

    current_score = 100.0
    for c in user.get("profile", {}).get("courses", []):
        if str(c.get("course_id")) == str(course_id):
            current_score = float(c.get("skill_score", 100.0))
            break

    new_score = round(min(100.0, current_score + bonus), 1)

    db.users.update_one(
        {"_id": oid(uid), "profile.courses.course_id": str(course_id)},
        {"$set": {"profile.courses.$.skill_score": new_score}}
    )

    db.skill_decay_logs.insert_one({
        "user_id":        uid,
        "course_id":      course_id,
        "decay_type":     "recovery_task_bonus",
        "decay_amount":   -bonus,
        "previous_score": current_score,
        "new_score":      new_score,
        "logged_at":      datetime.utcnow(),
        "breakdown":      {"recovery_bonus": bonus, "task_difficulty": task.get("difficulty")},
    })

    return new_score


def _recovery_message(score: float, pending: int, threshold: float, critical: float) -> str:
    if score >= threshold + 10:
        return "You're recovering well! Keep it up."
    if score >= threshold:
        return f"Almost there! Score is near the {threshold} threshold."
    if score >= critical:
        return f"Recovery mode active. Complete recovery tasks to rebuild your score."
    return f"Critical level! Focus on recovery tasks urgently."