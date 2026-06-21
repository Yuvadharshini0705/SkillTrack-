"""
routes/auth.py — SkillTrack v4 Auth Routes
Includes email notifications for registration & password change.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from db import get_db
from models import make_user, check_password, user_to_dict, make_notification, oid

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    db   = get_db()
    data = request.get_json()
    email    = data.get("email", "").lower().strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    user_doc = make_user(email, password, role="student")
    result   = db.users.insert_one(user_doc)
    uid      = result.inserted_id
    user_doc["_id"] = uid

    # In-app welcome notification
    db.notifications.insert_one(make_notification(
        uid,
        "Welcome to SkillTrack! 🎉",
        "Your account has been created. Complete your profile to start learning.",
        "success"
    ))

    # FIX #6: Removed send_welcome_email() call here.
    # The welcome email is sent in profile_setup (student.py) where we have the
    # student's real full_name. Sending it here sent a nameless email AND caused
    # every new student to receive two welcome emails.

    return jsonify({"message": "Account created successfully. Please login."}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    db   = get_db()
    data = request.get_json()
    email    = data.get("email", "").lower().strip()
    password = data.get("password", "")

    user = db.users.find_one({"email": email})
    if not user or not check_password(user, password):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.get("is_active", True):
        return jsonify({"error": "Account deactivated. Contact admin."}), 403

    token = create_access_token(identity=str(user["_id"]))
    return jsonify({
        "message": "Login successful",
        "token":   token,
        "user":    user_to_dict(user)
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    db      = get_db()
    user_id = get_jwt_identity()
    user    = db.users.find_one({"_id": oid(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_to_dict(user)), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    db      = get_db()
    user_id = get_jwt_identity()
    user    = db.users.find_one({"_id": oid(user_id)})
    data    = request.get_json()

    if not check_password(user, data.get("current_password", "")):
        return jsonify({"error": "Current password incorrect"}), 400

    new_pw = data.get("new_password", "")
    if len(new_pw) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    from werkzeug.security import generate_password_hash
    db.users.update_one(
        {"_id": oid(user_id)},
        {"$set": {"password_hash": generate_password_hash(new_pw)}}
    )

    # Email notification for password change
    try:
        from services.email_service import send_password_changed_email
        full_name = user.get("profile", {}).get("full_name", "")
        send_password_changed_email(db, user_id, user["email"], full_name)
    except Exception as e:
        print(f"[AUTH] Password change email error (non-fatal): {e}")

    return jsonify({"message": "Password updated"}), 200