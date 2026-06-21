"""
app.py — SkillTrack v4 Backend
Fixed: 
1. Added startup unlock job — runs midnight_unlock_job on every backend start
   so any missed unlocks (from server downtime) are processed immediately.
2. Nightly scheduler continues to run at IST midnight as before.
"""

import os
import time
import threading
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO, join_room, leave_room


load_dotenv()

socketio = SocketIO(async_mode="threading")

IST = timezone(timedelta(hours=5, minutes=30))


def now_ist() -> datetime:
    return datetime.now(IST)


def register_socket_events(sio):
    @sio.on("connect")
    def on_connect():
        print("[SOCKET] Client connected")

    @sio.on("disconnect")
    def on_disconnect():
        print("[SOCKET] Client disconnected")

    @sio.on("join")
    def on_join(data):
        user_id = data.get("user_id", "")
        if user_id:
            join_room(f"user_{user_id}")
            print(f"[SOCKET] uid={user_id} joined room")

    @sio.on("leave")
    def on_leave(data):
        user_id = data.get("user_id", "")
        if user_id:
            leave_room(f"user_{user_id}")


def emit_decay_alert(user_id: str, course_name: str, old_score: float, new_score: float):
    try:
        socketio.emit(
            "decay_alert",
            {"course_name": course_name, "old_score": old_score,
             "new_score": new_score, "drop": round(old_score - new_score, 1)},
            room=f"user_{user_id}",
        )
    except Exception as e:
        print(f"[SOCKET] emit_decay_alert failed: {e}")


def emit_skill_update(user_id: str, course_id: str, course_name: str, new_score: float):
    try:
        socketio.emit(
            "skill_score_update",
            {"course_id": course_id, "course_name": course_name, "new_score": new_score},
            room=f"user_{user_id}",
        )
    except Exception as e:
        print(f"[SOCKET] emit_skill_update failed: {e}")


def emit_notification(user_id: str, title: str, message: str, notif_type: str = "info"):
    try:
        socketio.emit(
            "notification_new",
            {"title": title, "message": message, "type": notif_type},
            room=f"user_{user_id}",
        )
    except Exception as e:
        print(f"[SOCKET] emit_notification failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# STARTUP UNLOCK JOB
# Runs once when backend starts — processes any missed unlocks
# from server downtime, restarts, or missed midnight scheduler runs.
# ─────────────────────────────────────────────────────────────────────────────

def _run_startup_unlock(app):
    """
    Runs immediately on backend startup in a background thread.
    Finds all students with pending_unlock=True and unlocks them
    if their day_passed_at is before right now (datetime.utcnow()).

    This fixes the case where:
    - Student submitted test on April 21
    - Backend was down / scheduler missed April 21 and April 22 midnight
    - Student still sees countdown on April 23
    """
    # Small delay to let the app fully initialize
    time.sleep(3)

    print("\n[STARTUP] Running startup unlock job...")
    try:
        with app.app_context():
            from db import get_db
            from utils.assignment import midnight_unlock_job_for_all_pending

            db       = get_db()
            unlocked = midnight_unlock_job_for_all_pending(db)
            print(f"[STARTUP] Startup unlock done — {unlocked} student(s) unlocked\n")
    except Exception as e:
        print(f"[STARTUP] Startup unlock error (non-fatal): {e}")


def _run_nightly_decay(app):
    while True:
        current_ist = now_ist()
        next_midnight_ist = (current_ist + timedelta(days=1)).replace(
            hour=0, minute=0, second=5, microsecond=0
        )
        sleep_secs = (next_midnight_ist - current_ist).total_seconds()
        print(
            f"[SCHEDULER] Next decay+unlock check in {sleep_secs / 3600:.1f} h "
            f"({next_midnight_ist.strftime('%Y-%m-%d %H:%M IST')})"
        )
        time.sleep(sleep_secs)

        print(f"[SCHEDULER] Running nightly decay — {now_ist().strftime('%Y-%m-%d %H:%M IST')}")
        try:
            with app.app_context():
                from db import get_db
                from services.skill_engine import run_decay_check_with_socket
                from utils.assignment import midnight_unlock_job

                db = get_db()
                decayed = run_decay_check_with_socket(db, _emit_decay_with_email)
                print(f"[SCHEDULER] Decay done — {decayed} score(s) affected")

                unlocked = midnight_unlock_job(db)
                print(f"[SCHEDULER] Unlock done — {unlocked} day(s) unlocked")
        except Exception as e:
            print(f"[SCHEDULER] ERROR: {e}")


def _emit_decay_with_email(user_id: str, course_name: str, old_score: float, new_score: float):
    emit_decay_alert(user_id, course_name, old_score, new_score)
    try:
        from db import get_db
        from bson import ObjectId
        db = get_db()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            email     = user.get("email", "")
            full_name = user.get("profile", {}).get("full_name", "")
            drop      = round(old_score - new_score, 1)
            if email:
                from services.email_service import send_skill_decay_email
                send_skill_decay_email(
                    db=db, user_id=user_id, to_email=email, full_name=full_name,
                    course_name=course_name, old_score=old_score, new_score=new_score,
                    decay_type="time_decay", decay_amount=drop
                )
    except Exception as e:
        print(f"[SCHEDULER] Decay email error (non-fatal): {e}")


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"]               = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"]           = os.getenv("JWT_SECRET_KEY", "jwt-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

    CORS(app)
    JWTManager(app)

    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode="threading",
        allow_upgrades=False,
        logger=False,
        engineio_logger=False,
    )
    register_socket_events(socketio)
    print("[SOCKET] Initialized (threading / polling-only)")

    try:
        from db import get_db
        get_db()
        print("[DB] Connected")
    except Exception as e:
        print(f"[DB ERROR] {e}")

    # ── Register all blueprints ────────────────────────────────────────────────
    from routes.auth        import auth_bp
    from routes.admin       import admin_bp
    from routes.student     import student_bp
    from routes.bulk_upload import bulk_upload_bp
    from routes.tasks       import tasks_bp
    from routes.admin_email import admin_email_bp
    from routes.performance import performance_bp
    from routes.recovery import recovery_bp
    from routes.admin_recovery import admin_recovery_bp
    

    app.register_blueprint(auth_bp,          url_prefix="/api/auth")
    app.register_blueprint(admin_bp,         url_prefix="/api/admin")
    app.register_blueprint(student_bp,       url_prefix="/api/student")
    app.register_blueprint(bulk_upload_bp,   url_prefix="/api/admin")
    app.register_blueprint(tasks_bp,         url_prefix="/api/tasks")
    app.register_blueprint(admin_email_bp,   url_prefix="/api/admin")
    app.register_blueprint(performance_bp,   url_prefix="/api/student")
    app.register_blueprint(recovery_bp, url_prefix="/api/recovery")
    app.register_blueprint(admin_recovery_bp, url_prefix="/api/admin/recovery")

    try:
        from utils.seed import seed_data
        with app.app_context():
            seed_data()
    except Exception:
        print("[INFO] Seed skipped")

    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":

        # ── Startup unlock — runs once on backend start ────────────────────
        startup_thread = threading.Thread(
            target=_run_startup_unlock,
            args=(app,),
            daemon=True,
            name="startup-unlock",
        )
        startup_thread.start()
        print("[STARTUP] Startup unlock thread started")

        # ── Nightly scheduler — runs at IST midnight every night ───────────
        scheduler_thread = threading.Thread(
            target=_run_nightly_decay,
            args=(app,),
            daemon=True,
            name="decay-scheduler",
        )
        scheduler_thread.start()
        print("[SCHEDULER] Nightly decay+unlock scheduler started (fires at IST midnight)")

    return app


if __name__ == "__main__":
    application = create_app()
    print("\n🚀  SkillTrack v4 backend → http://localhost:5000\n")
    socketio.run(application, debug=True, port=5000, host="0.0.0.0")