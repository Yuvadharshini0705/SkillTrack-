"""
routes/admin_email.py — Admin Email Broadcast Routes
Fixed: removed duplicate admin_required decorator (was defined in both
       admin_email.py and admin.py — Flask blueprints are separate so it's
       fine to have one per file, but the import must not clash).
"""

import threading
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from db import get_db
from models import oid, serialize

admin_email_bp = Blueprint("admin_email", __name__)


def _admin_required(f):
    """Local admin check — separate from admin.py's decorator to avoid import conflicts."""
    @wraps(f)
    @jwt_required()
    def wrapped(*args, **kwargs):
        db   = get_db()
        user = db.users.find_one({"_id": oid(get_jwt_identity())})
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return wrapped


# ── GET /api/admin/email/recipients ──────────────────────────────────────────

@admin_email_bp.route("/email/recipients", methods=["GET"])
@_admin_required
def get_email_recipients():
    """Return summary of students who have email notifications enabled."""
    db        = get_db()
    course_id = request.args.get("course_id")

    query = {"role": "student", "is_active": True}
    if course_id:
        query["profile.courses.course_id"] = course_id

    students = list(db.users.find(query, {
        "email": 1,
        "profile.full_name": 1,
        "profile.email_notifications": 1,
    }))
    enabled  = [s for s in students if s.get("profile", {}).get("email_notifications", True)]
    disabled = [s for s in students if not s.get("profile", {}).get("email_notifications", True)]

    return jsonify({
        "total":    len(students),
        "enabled":  len(enabled),
        "disabled": len(disabled),
        "recipients": [
            {
                "email": s.get("email"),
                "name":  s.get("profile", {}).get("full_name", ""),
                "email_notifications": s.get("profile", {}).get("email_notifications", True),
            }
            for s in students
        ]
    }), 200


# ── POST /api/admin/email/broadcast ──────────────────────────────────────────

@admin_email_bp.route("/email/broadcast", methods=["POST"])
@_admin_required
def broadcast_email():
    """
    Send a broadcast email to all or filtered students.
    Body: { subject, message, course_id (optional), notify_all (bool) }
    """
    data       = request.get_json() or {}
    subject    = (data.get("subject") or "").strip()
    message    = (data.get("message") or "").strip()
    course_id  = data.get("course_id")
    notify_all = bool(data.get("notify_all", False))

    if not subject or not message:
        return jsonify({"error": "Subject and message are required"}), 400
    if len(subject) > 200:
        return jsonify({"error": "Subject too long (max 200 chars)"}), 400
    if len(message) > 5000:
        return jsonify({"error": "Message too long (max 5000 chars)"}), 400

    db         = get_db()
    uid        = get_jwt_identity()
    admin      = db.users.find_one({"_id": oid(uid)})
    admin_name = (admin or {}).get("profile", {}).get("full_name", "Admin")

    query = {"role": "student", "is_active": True}
    if course_id:
        query["profile.courses.course_id"] = course_id
    if not notify_all:
        query["profile.email_notifications"] = {"$ne": False}

    students   = list(db.users.find(query, {"email": 1, "profile.full_name": 1}))
    recipients = [
        {"email": s.get("email", ""), "name": s.get("profile", {}).get("full_name", "")}
        for s in students if s.get("email")
    ]

    if not recipients:
        return jsonify({"error": "No eligible recipients found"}), 400

    log_entry = {
        "type":            "admin_broadcast",
        "admin_id":        str(uid),
        "admin_name":      admin_name,
        "subject":         subject,
        "message":         message,
        "course_id":       course_id,
        "recipient_count": len(recipients),
        "status":          "queued",
        "created_at":      datetime.utcnow(),
    }
    log_result = db.email_logs.insert_one(log_entry)
    log_id     = str(log_result.inserted_id)

    def _do_send():
        try:
            from services.email_service import send_admin_broadcast
            result = send_admin_broadcast(recipients, subject, message, admin_name)
            db.email_logs.update_one(
                {"_id": oid(log_id)},
                {"$set": {
                    "status":      "sent",
                    "sent_count":  result["sent"],
                    "fail_count":  result["failed"],
                    "finished_at": datetime.utcnow(),
                }}
            )
            print(f"[EMAIL] Broadcast done: {result['sent']} sent, {result['failed']} failed")
        except Exception as e:
            db.email_logs.update_one(
                {"_id": oid(log_id)},
                {"$set": {"status": "error", "error": str(e), "finished_at": datetime.utcnow()}}
            )
            print(f"[EMAIL] Broadcast error: {e}")

    threading.Thread(target=_do_send, daemon=True).start()

    return jsonify({
        "message":         f"Email broadcast queued for {len(recipients)} recipient(s)",
        "recipient_count": len(recipients),
        "log_id":          log_id,
    }), 202


# ── GET /api/admin/email/logs ─────────────────────────────────────────────────

@admin_email_bp.route("/email/logs", methods=["GET"])
@_admin_required
def email_logs():
    """Return recent email broadcast history."""
    db   = get_db()
    page = request.args.get("page", 1, type=int)
    per  = 20
    logs = list(db.email_logs.find(
        {},
        sort=[("created_at", -1)],
        skip=(page - 1) * per,
        limit=per,
    ))
    total = db.email_logs.count_documents({})
    return jsonify({
        "logs":  [serialize(l) for l in logs],
        "total": total,
        "page":  page,
    }), 200


# ── POST /api/admin/email/test ────────────────────────────────────────────────

@admin_email_bp.route("/email/test", methods=["POST"])
@_admin_required
def send_test_email():
    """Send a test email to the admin's own address to verify SMTP config."""
    db    = get_db()
    uid   = get_jwt_identity()
    admin = db.users.find_one({"_id": oid(uid)})
    email = admin.get("email", "") if admin else ""
    name  = (admin or {}).get("profile", {}).get("full_name", "Admin")

    if not email:
        return jsonify({"error": "No email found for admin"}), 400

    from services.email_service import send_email
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:40px auto;
                background:#0f172a;padding:32px;border-radius:16px;
                border:1px solid #334155">
      <h2 style="color:#38bdf8;margin:0 0 16px">✅ Email Config Working!</h2>
      <p style="color:#94a3b8">
        Hi {name}, your SkillTrack email configuration is working correctly.
      </p>
      <p style="color:#64748b;font-size:13px;margin-top:24px">
        Sent: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
      </p>
    </div>"""

    ok = send_email(email, "[SkillTrack] Test Email — Config Verified ✅", html, name)
    if ok:
        return jsonify({"message": f"Test email sent to {email}"}), 200
    return jsonify({"error": "Failed to send. Check MAIL_* settings in .env"}), 500