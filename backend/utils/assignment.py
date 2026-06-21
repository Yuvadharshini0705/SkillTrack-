"""
utils/assignment.py
===================
FIXED VERSION v5:
  KEY FIX: Daily progression NO LONGER requires test completion.
  
  The midnight job now advances ALL students to the next day regardless
  of whether they completed the current day's test.
  
  Old behaviour (WRONG for decay tracking):
    - advance_student_day() called only after test submit
    - pending_unlock = True only if student completed test
    - midnight job only unlocks students with pending_unlock = True
    → Students who skip Day 1 are STUCK forever
  
  New behaviour (CORRECT for decay tracking):
    - midnight_unlock_job() runs for ALL active enrolled students
    - Does NOT check pending_unlock at all
    - Simply sets current_day = current_day + 1 for everyone
    - Skipped days are tracked separately for decay calculation
    - advance_student_day() still called after submit (for streak/XP only)
    - pending_unlock field kept for backward compatibility but NOT used
      as a gate anymore
"""

from datetime import datetime, timedelta, timezone
from models import make_notification, oid

IST = timezone(timedelta(hours=5, minutes=30))


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _now_ist() -> datetime:
    return datetime.now(IST)


def _today_midnight_ist_as_utc() -> datetime:
    ist_now      = _now_ist()
    ist_midnight = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return ist_midnight.astimezone(timezone.utc).replace(tzinfo=None)


def _yesterday_midnight_ist_as_utc() -> datetime:
    return _today_midnight_ist_as_utc() - timedelta(days=1)


def _seconds_until_ist_midnight() -> int:
    ist_now       = _now_ist()
    next_midnight = (ist_now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return int((next_midnight - ist_now).total_seconds())


def _normalize_datetime(dt) -> datetime:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    if isinstance(dt, str):
        try:
            parsed = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            if parsed.tzinfo is not None:
                return parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        except Exception as e:
            print(f"[NORMALIZE] Failed to parse datetime string '{dt}': {e}")
            return None
    return None


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL — advance a single enrollment unconditionally
# ─────────────────────────────────────────────────────────────────────────────

def _do_advance_enrollment(db, uid: str, enrollment: dict) -> int | None:
    """
    FIXED: Advances current_day by 1 for a single enrollment.
    
    This is now UNCONDITIONAL — does NOT check pending_unlock or
    whether the student completed today's test. This is correct because:
    
      - This system tracks SKILL DECAY, not course progress gates
      - A student who skips Day 1 should still get Day 2 tomorrow
      - Skipping is recorded separately and causes skill decay
      - Students can still go back and complete old day tasks
    
    Returns new_day if advanced, None if already advanced today.
    """
    course_id   = str(enrollment.get("course_id", ""))
    current_day = int(enrollment.get("current_day", 1))

    # ── Guard: don't advance the same student twice on the same IST day ──
    last_advanced = _normalize_datetime(enrollment.get("last_advanced_at"))
    today_midnight_utc = _today_midnight_ist_as_utc()

    if last_advanced is not None and last_advanced >= today_midnight_utc:
        print(f"[ADVANCE] Skipping uid={uid} course={course_id} — already advanced today")
        return None

    new_day = current_day + 1

    print(f"[ADVANCE] uid={uid} Day {current_day} → Day {new_day} (course={course_id})")

    result = db.users.update_one(
        {
            "_id": oid(uid),
            "profile.courses.course_id": course_id,
        },
        {
            "$set": {
                "profile.courses.$.current_day":    new_day,
                "profile.courses.$.last_advanced_at": datetime.utcnow(),
                # Keep these for backward compat but they no longer gate anything
                "profile.courses.$.pending_unlock": False,
                "profile.courses.$.day_passed_at":  None,
                "profile.courses.$.passed_day_num": None,
            }
        }
    )

    if result.modified_count == 0:
        print(f"[ADVANCE] ❌ MongoDB update failed uid={uid} course={course_id}")
        return None

    print(f"[ADVANCE] ✅ uid={uid} → Day {new_day}")

    # ── Notifications ─────────────────────────────────────────────────────
    course      = db.courses.find_one({"_id": oid(course_id)})
    course_name = course.get("name", "your course") if course else "your course"

    # Check if today's test was completed (for message wording)
    completed_yesterday = db.test_sessions.find_one({
        "user_id":      uid,
        "course_id":    course_id,
        "completed":    True,
        "submitted_at": {"$gte": _yesterday_midnight_ist_as_utc()},
    })

    tasks_ready = db.tasks.count_documents({
        "course_id": course_id,
        "status":    "approved",
        "$or": [
            {"day_range_start": new_day, "day_range_end": new_day},
            {"day": new_day},
        ],
    }) > 0

    if completed_yesterday:
        # Student completed yesterday → positive message
        title   = f"Day {new_day} Unlocked! 🔓"
        message = (
            f"Great work! Day {new_day} tasks in {course_name} are now available. "
            f"Keep your streak going!"
        )
    else:
        # Student skipped yesterday → still unlock but note the miss
        title   = f"Day {new_day} Available 📅"
        message = (
            f"Day {new_day} has started in {course_name}. "
            f"You missed yesterday's test — your skill score may have decayed. "
            f"Try to complete today's test!"
        )

    if tasks_ready:
        db.notifications.insert_one(make_notification(
            user_id=uid, title=title, message=message, notif_type="success"
        ))
        # Send email
        try:
            user_doc = db.users.find_one({"_id": oid(uid)})
            if user_doc:
                email     = user_doc.get("email", "")
                full_name = user_doc.get("profile", {}).get("full_name", "")
                if email:
                    from services.email_service import send_daily_test_assigned_email
                    task_count = db.tasks.count_documents({
                        "course_id": course_id,
                        "status":    "approved",
                        "$or": [
                            {"day_range_start": new_day, "day_range_end": new_day},
                            {"day": new_day},
                        ],
                    })
                    task_types = list(db.tasks.distinct("task_type", {
                        "course_id": course_id,
                        "status":    "approved",
                        "$or": [
                            {"day_range_start": new_day, "day_range_end": new_day},
                            {"day": new_day},
                        ],
                    }))
                    send_daily_test_assigned_email(
                        db=db, user_id=uid, to_email=email,
                        full_name=full_name, course_name=course_name,
                        day=new_day, task_count=task_count,
                        task_types=task_types,
                    )
        except Exception as e:
            print(f"[ADVANCE] Email error (non-fatal): {e}")
    else:
        db.notifications.insert_one(make_notification(
            user_id=uid,
            title=f"Day {new_day} Started 📅",
            message=(
                f"Day {new_day} has started in {course_name}. "
                f"Tasks will appear once your admin publishes them."
            ),
            notif_type="info",
        ))

    return new_day


# ─────────────────────────────────────────────────────────────────────────────
# 1. Called right after submit_test — records completion for streak/XP only
#    NO LONGER sets pending_unlock as a gate for day progression
# ─────────────────────────────────────────────────────────────────────────────

def advance_student_day(db, uid: str, course_id: str, completed_day: int, percent: int) -> bool:
    """
    Called after every test submission.

    CHANGED: No longer sets pending_unlock as a gate.
    Now only records that the student completed this day's test,
    which is used for:
      - streak calculation
      - "completed yesterday" check in notification wording
      - decay calculation (skipped days)

    Day advancement (current_day N → N+1) now happens unconditionally
    at midnight via midnight_unlock_job(), regardless of this call.

    Returns True if the completion was recorded.
    """
    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        print(f"[DAY] ❌ User {uid} not found")
        return False

    current_day = 1
    for enrollment in user.get("profile", {}).get("courses", []):
        if str(enrollment.get("course_id")) == str(course_id):
            current_day = int(enrollment.get("current_day", 1))
            break

    print(f"[DAY] completed_day={completed_day} current_day={current_day}")

    if completed_day != current_day:
        print(f"[DAY] note — completed_day {completed_day} != current_day {current_day} (old task)")

    now_utc = datetime.utcnow()

    # Record completion timestamp (used by midnight job for notification wording
    # and by decay engine for skipped_days count)
    result = db.users.update_one(
        {
            "_id": oid(uid),
            "profile.courses.course_id": str(course_id),
        },
        {
            "$set": {
                "profile.courses.$.last_test_completed_at": now_utc,
                # Keep pending_unlock for any legacy code that reads it
                "profile.courses.$.pending_unlock": True,
                "profile.courses.$.day_passed_at":  now_utc,
                "profile.courses.$.passed_day_num": current_day,
            }
        }
    )

    if result.modified_count == 0:
        print(f"[DAY] ❌ MongoDB update failed for uid={uid} course_id={course_id}")
        return False

    ist_now = _now_ist()
    print(
        f"[DAY] ✅ User {uid} completed Day {current_day} ({percent}%) at "
        f"{ist_now.strftime('%Y-%m-%d %H:%M IST')} — midnight will advance to Day {current_day + 1}"
    )
    return True


# ─────────────────────────────────────────────────────────────────────────────
# 2. FIXED Midnight scheduler job — advances ALL students unconditionally
# ─────────────────────────────────────────────────────────────────────────────

def midnight_unlock_job(db) -> int:
    """
    FIXED: Runs every night at 00:00 IST.
    
    OLD: Only advanced students with pending_unlock = True
         (i.e. only students who completed their test)
    
    NEW: Advances ALL active enrolled students unconditionally.
         Students who skipped will have their skill score decayed separately
         by the skill engine, but they still get the next day's tasks.
    
    This is correct for a Skill Decay & Recovery Tracking System:
    time moves forward regardless of student activity.
    """
    unlocked = 0
    ist_now  = _now_ist()
    print(f"\n[MIDNIGHT] Running at {ist_now.strftime('%Y-%m-%d %H:%M IST')}")

    # ── Get ALL active students (no pending_unlock filter) ────────────────
    students = list(db.users.find({
        "role":     "student",
        "is_active": True,
        "profile.courses": {"$exists": True, "$ne": []},
    }))

    print(f"[MIDNIGHT] Found {len(students)} active students")

    for student in students:
        uid = str(student["_id"])
        for enrollment in student.get("profile", {}).get("courses", []):
            course_id = str(enrollment.get("course_id", ""))
            if not course_id:
                continue

            new_day = _do_advance_enrollment(db, uid, enrollment)
            if new_day is not None:
                unlocked += 1

    print(f"[MIDNIGHT] Done — {unlocked} students advanced to next day\n")
    return unlocked


# ─────────────────────────────────────────────────────────────────────────────
# 3. Per-user unlock — called by frontend when countdown hits 0
#    FIXED: now also works even if student didn't submit test
# ─────────────────────────────────────────────────────────────────────────────

def midnight_unlock_job_for_user(db, uid: str) -> int:
    """
    FIXED: Called when the frontend countdown timer reaches zero.
    
    Now advances the student regardless of whether they completed
    yesterday's test. Uses datetime.utcnow() as cutoff.
    """
    now_utc  = datetime.utcnow()
    unlocked = 0

    print(f"\n[UNLOCK-CHECK] Running for user {uid} at {now_utc.isoformat()} UTC")

    student = db.users.find_one({"_id": oid(uid), "is_active": True})
    if not student:
        print(f"[UNLOCK-CHECK] ❌ Student {uid} not found")
        return 0

    for enrollment in student.get("profile", {}).get("courses", []):
        course_id = str(enrollment.get("course_id", ""))
        if not course_id:
            continue

        new_day = _do_advance_enrollment(db, uid, enrollment)
        if new_day is not None:
            unlocked += 1
            print(f"[UNLOCK-CHECK] ✅ Unlocked Day {new_day} for user {uid}")

    print(f"[UNLOCK-CHECK] Done — {unlocked} day(s) unlocked\n")
    return unlocked


# ─────────────────────────────────────────────────────────────────────────────
# 4. Startup job — fixes all missed advancements
# ─────────────────────────────────────────────────────────────────────────────

def midnight_unlock_job_for_all_pending(db) -> int:
    """
    Runs once on backend startup.
    Advances any student whose last_advanced_at is before today's midnight,
    ensuring no one is stuck if the backend was down during midnight.
    """
    now_utc  = datetime.utcnow()
    unlocked = 0

    print(f"\n[STARTUP-UNLOCK] Running for ALL students at {now_utc.isoformat()} UTC")

    students = list(db.users.find({
        "role":     "student",
        "is_active": True,
        "profile.courses": {"$exists": True, "$ne": []},
    }))

    print(f"[STARTUP-UNLOCK] Found {len(students)} students")

    for student in students:
        uid = str(student["_id"])
        for enrollment in student.get("profile", {}).get("courses", []):
            course_id = str(enrollment.get("course_id", ""))
            if not course_id:
                continue

            new_day = _do_advance_enrollment(db, uid, enrollment)
            if new_day is not None:
                unlocked += 1

    print(f"[STARTUP-UNLOCK] Done — {unlocked} student(s) advanced\n")
    return unlocked


# ─────────────────────────────────────────────────────────────────────────────
# 5. Notify students of new tasks (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

def notify_students_of_new_tasks(db, course_id: str, course_name: str) -> int:
    days_with_tasks = set(db.tasks.distinct("day_range_start", {
        "course_id": str(course_id),
        "status":    "approved",
    }))
    if not days_with_tasks:
        return 0

    students = list(db.users.find({
        "role":                      "student",
        "is_active":                 True,
        "profile.courses.course_id": str(course_id),
    }))

    today_start_utc = _today_midnight_ist_as_utc()
    notified = 0

    for student in students:
        uid = str(student["_id"])
        for enrollment in student.get("profile", {}).get("courses", []):
            if str(enrollment.get("course_id")) != str(course_id):
                continue
            current_day = int(enrollment.get("current_day", 1))
            if current_day not in days_with_tasks:
                break
            already = db.notifications.find_one({
                "user_id":    uid,
                "created_at": {"$gte": today_start_utc},
                "title":      f"Day {current_day} tasks",
            })
            if not already:
                db.notifications.insert_one(make_notification(
                    user_id=uid,
                    title=f"Day {current_day} tasks in {course_name} are ready!",
                    message=(
                        f"Your Day {current_day} test is available. "
                        f"Take it now to keep your streak going!"
                    ),
                    notif_type="info",
                ))
                notified += 1
            break

    print(f"[NOTIFY] Sent {notified} task-ready notifications — course {course_id}")
    return notified


# ─────────────────────────────────────────────────────────────────────────────
# Public helper
# ─────────────────────────────────────────────────────────────────────────────

def seconds_until_ist_midnight() -> int:
    return _seconds_until_ist_midnight()