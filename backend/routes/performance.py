from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_db
from models import serialize

performance_bp = Blueprint("performance", __name__)


@performance_bp.route("/history", methods=["GET"])
@jwt_required()
def get_history():
    db        = get_db()
    user_id   = get_jwt_identity()
    course_id = request.args.get("course_id", "")
    limit     = request.args.get("limit", 20, type=int)

    query = {"user_id": str(user_id)}
    if course_id:
        query["course_id"] = str(course_id)

    perfs = list(db.performances.find(query, sort=[("submitted_at", -1)], limit=limit))
    return jsonify([serialize(p) for p in perfs]), 200