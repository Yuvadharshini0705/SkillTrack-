"""
routes/tasks.py — SkillTrack v4 Task Routes
Note: AI generation removed. Use Bulk Upload (CSV/Excel) instead.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from db import get_db
from models import serialize, oid, make_task

tasks_bp = Blueprint("tasks", __name__)


def _require_admin(user_id: str) -> bool:
    db   = get_db()
    user = db.users.find_one({"_id": oid(user_id)})
    return bool(user and user.get("role") == "admin")


# =============================================================================
# ADMIN — REVIEW SINGLE TASK
# =============================================================================

@tasks_bp.route("/<task_id>/review", methods=["POST"])
@jwt_required()
def review_task(task_id):
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    action = request.get_json(force=True).get("action", "")
    if action not in ("approve", "reject"):
        return jsonify({"error": "action must be 'approve' or 'reject'"}), 400

    db   = get_db()
    task = db.tasks.find_one({"_id": oid(task_id)})
    if not task:
        return jsonify({"error": "Task not found"}), 404

    new_status = "approved" if action == "approve" else "rejected"
    db.tasks.update_one(
        {"_id": oid(task_id)},
        {"$set": {"status": new_status, "reviewed_at": datetime.utcnow(), "reviewed_by": uid}}
    )
    task["status"] = new_status
    return jsonify({"message": f"Task {new_status}", "task_id": task_id, "status": new_status}), 200


# =============================================================================
# ADMIN — BULK APPROVE
# =============================================================================

@tasks_bp.route("/bulk-approve", methods=["POST"])
@jwt_required()
def bulk_approve():
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db   = get_db()
    data = request.get_json(force=True) or {}

    query = {"status": "pending"}
    if data.get("course_slug"):
        course = db.courses.find_one({"slug": data["course_slug"]})
        if course:
            query["course_id"] = str(course["_id"])
    if data.get("day"):
        query["day_range_start"] = int(data["day"])

    pending = list(db.tasks.find(query))
    if not pending:
        return jsonify({"message": "No pending tasks found", "approved": 0}), 200

    ids = [t["_id"] for t in pending]
    db.tasks.update_many(
        {"_id": {"$in": ids}},
        {"$set": {"status": "approved", "reviewed_at": datetime.utcnow(), "reviewed_by": uid}}
    )
    return jsonify({
        "message":  f"Approved {len(pending)} tasks",
        "approved": len(pending),
    }), 200


# =============================================================================
# ADMIN — LIST TASKS
# =============================================================================

@tasks_bp.route("/", methods=["GET"])
@jwt_required()
def list_tasks():
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db    = get_db()
    query = {}

    status = request.args.get("status")
    if status:
        query["status"] = status

    course_slug = request.args.get("course_slug")
    if course_slug:
        course = db.courses.find_one({"slug": course_slug})
        if course:
            query["course_id"] = str(course["_id"])

    day = request.args.get("day")
    if day:
        query["day_range_start"] = int(day)

    tasks = list(db.tasks.find(query).sort("created_at", -1).limit(200))
    return jsonify([serialize(t) for t in tasks]), 200


# =============================================================================
# ADMIN — CRUD SINGLE TASK
# =============================================================================

@tasks_bp.route("/<task_id>", methods=["GET"])
@jwt_required()
def get_task(task_id):
    db   = get_db()
    task = db.tasks.find_one({"_id": oid(task_id)})
    if not task:
        return jsonify({"error": "Not found"}), 404
    return jsonify(serialize(task)), 200


@tasks_bp.route("/<task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db   = get_db()
    data = request.get_json(force=True)
    for key in ("_id", "course_id", "created_at", "created_by"):
        data.pop(key, None)

    db.tasks.update_one({"_id": oid(task_id)}, {"$set": data})
    task = db.tasks.find_one({"_id": oid(task_id)})
    return jsonify(serialize(task)), 200


@tasks_bp.route("/<task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id):
    uid = get_jwt_identity()
    if not _require_admin(uid):
        return jsonify({"error": "Admin access required"}), 403

    db     = get_db()
    result = db.tasks.delete_one({"_id": oid(task_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"message": "Task deleted"}), 200