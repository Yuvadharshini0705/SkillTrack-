"""
services/skill_engine.py  —  Skill Decay & Recovery Engine

FIXES APPLIED:
  1. _get_failure_streak: counts consecutive FAILED TEST SESSIONS (percent < 60)
     instead of individual wrong performance records.

  2. _get_skipped_days: uses IST-aware day boundaries.

  3. apply_failure_decay: returns None (not current_score) when penalty <= 0
     so submit_test correctly falls into the else-branch and saves the
     computed score.

  4. apply_recovery_bonus: returns None (not current_score) when bonus <= 0
     for the same reason.

  5. _get_days_inactive: strips tzinfo before subtracting from utcnow() to
     prevent "can't subtract offset-naive and offset-aware datetimes" crash
     when enrolled_at was stored with a timezone suffix.

  6. FIX: All datetime.fromisoformat() calls now do .replace("Z", "+00:00")
     before parsing so they handle ISO strings that end with "Z" (which
     Python < 3.11 cannot parse natively).
"""

from datetime import datetime, timedelta, timezone
from models import oid, make_decay_log, make_notification

# IST = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))

# ── Weights ───────────────────────────────────────────────────────────────────
WEIGHT_TIME      = 0.35
WEIGHT_FAILURE   = 0.30
WEIGHT_TOPIC     = 0.15
WEIGHT_WEEKLY    = 0.15
WEIGHT_SKIP      = 0.05

# ── Inactivity curve ──────────────────────────────────────────────────────────
INACTIVITY_TABLE = [
    (0,  3,  0),
    (3,  5,  3),
    (5,  7,  6),
    (7,  10, 12),
    (10, 14, 20),
    (14, 999, 30),
]

# ── Failure streak penalties (consecutive FAILED SESSIONS, not wrong answers) ─
FAILURE_STREAK_TABLE = {3: 4, 5: 8, 7: 12}

# ── Topic weakness ────────────────────────────────────────────────────────────
TOPIC_WEAK_ACCURACY     = 0.45
TOPIC_WEAK_MIN_ATTEMPTS = 4
TOPIC_WEAK_PENALTY      = 5
TOPIC_WEAK_MAX_TOPICS   = 3

# ── Weekly average ────────────────────────────────────────────────────────────
WEEKLY_LOW_THRESHOLD = 55
WEEKLY_BASE_PENALTY  = 6

# ── Skip penalty ──────────────────────────────────────────────────────────────
SKIP_PENALTY_PER_DAY = 2
SKIP_MAX_DAYS        = 3

# ── Global caps ───────────────────────────────────────────────────────────────
MAX_DECAY_PER_RUN = 25
MIN_SCORE         = 0
MAX_SCORE         = 100

# ── Recovery thresholds ───────────────────────────────────────────────────────
RECOVERY_TASK_THRESHOLD = 45  # below → recovery tasks assigned
RECOVERY_UI_THRESHOLD   = 50  # below → UI shows recovery mode + easier questions
CRITICAL_THRESHOLD      = 30  # below → extra recovery + urgent notification

# ── Pass threshold (below = failed session for streak purposes) ───────────────
PASS_THRESHOLD = 60

# ── Streak protection ─────────────────────────────────────────────────────────
STREAK_REDUCTION_PER_DAY = 0.05
STREAK_MAX_REDUCTION     = 0.40


# ── Helper: safely parse a datetime string that may end with "Z" ──────────────
def _parse_dt(value) -> datetime | None:
    """
    Parse a datetime value that may be:
      - already a datetime object
      - an ISO string ending with 'Z'  (e.g. '2026-05-16T06:04:05.746Z')
      - an ISO string ending with '+00:00'
      - a naive ISO string

    Always returns a timezone-naive UTC datetime, or None if unparseable.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
    if isinstance(value, str):
        try:
            # Replace 'Z' with '+00:00' so Python < 3.11 can handle it
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is not None:
                return parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        except (ValueError, TypeError):
            return None
    return None


# =============================================================================
# PUBLIC API
# =============================================================================

def compute_skill_score(db, uid: str, course_id: str) -> float:
    """Recomputes skill score from recent test session history."""
    sessions = list(db.test_sessions.find(
        {"user_id": str(uid), "course_id": course_id, "completed": True},
        sort=[("submitted_at", -1)],
        limit=10,
    ))

    user   = db.users.find_one({"_id": oid(uid)})
    stored = _get_skill_score(user, course_id) if user else 100.0

    if not sessions:
        return stored

    total_weight = 0.0
    weighted_sum = 0.0
    for i, session in enumerate(sessions):
        weight        = 1.0 / (i + 1)
        weighted_sum += session.get("percent", 0) * weight
        total_weight += weight

    computed = round(weighted_sum / total_weight, 1) if total_weight else 100.0
    blended  = round(computed * 0.70 + stored * 0.30, 1)
    return float(max(MIN_SCORE, min(MAX_SCORE, blended)))


def apply_failure_decay(db, uid: str, course_id: str, test_percent: int):
    """
    Called when test score < 40%.

    Returns new skill score (float) if a penalty was applied and saved,
    or None if no change was made to the DB.
    """
    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return None

    current_score = _get_skill_score(user, course_id)
    streak        = int(user.get("profile", {}).get("current_streak", 0))
    streak_mult   = max(0.6, 1.0 - streak * STREAK_REDUCTION_PER_DAY)

    gap     = max(0, 40 - test_percent)
    penalty = min(12, round((gap / 40) * 12 * streak_mult, 1))

    if penalty <= 0:
        return None

    new_score = round(max(MIN_SCORE, current_score - penalty), 1)
    _save_skill_score(db, uid, course_id, new_score)

    db.skill_decay_logs.insert_one(make_decay_log(
        user_id=uid, course_id=course_id, decay_type="test_failure",
        decay_amount=penalty, previous_score=current_score, new_score=new_score,
        breakdown={"failure_penalty": penalty, "test_percent": test_percent},
    ))

    db.notifications.insert_one(make_notification(
        user_id=uid,
        title="Skill score dropped",
        message=(
            f"You scored {test_percent}% — below the 40% threshold. "
            f"Skill score dropped by {penalty} pts to {new_score}."
        ),
        notif_type="decay",
    ))

    if new_score <= RECOVERY_TASK_THRESHOLD:
        _assign_recovery_tasks(db, uid, course_id, new_score)

    return new_score


def apply_recovery_bonus(db, uid: str, course_id: str, test_percent: int):
    """
    Called when test score >= 60% (PASS_THRESHOLD).
    Scores 40-59% are a neutral zone — no bonus, no penalty.

    Returns new skill score (float) if a bonus was applied and saved,
    or None if no change was made to the DB.
    """
    if test_percent < PASS_THRESHOLD:
        return None

    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return None

    current_score = _get_skill_score(user, course_id)
    if current_score >= MAX_SCORE:
        return current_score  # already at 100 — save not needed, value is correct

    streak       = int(user.get("profile", {}).get("current_streak", 0))
    streak_bonus = min(streak * 0.5, 3.0)

    gap   = max(0, test_percent - PASS_THRESHOLD)
    bonus = round(min(8, (gap / (100 - PASS_THRESHOLD)) * 8) + streak_bonus, 1)

    if bonus <= 0:
        return None

    new_score = round(min(MAX_SCORE, current_score + bonus), 1)
    _save_skill_score(db, uid, course_id, new_score)

    db.notifications.insert_one(make_notification(
        user_id=uid,
        title="Skill score improved!",
        message=(
            f"You scored {test_percent}% — skill score increased by "
            f"{bonus} pts to {new_score}."
        ),
        notif_type="success",
    ))

    return new_score


def get_skill_breakdown(db, uid: str, course_id: str) -> dict:
    """Returns per-topic skill breakdown for the analytics page."""
    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return {"error": "User not found"}

    overall_score = _get_skill_score(user, course_id)
    perfs = list(db.performances.find(
        {"user_id": str(uid), "course_id": str(course_id)}
    ))

    topic_map = {}
    for p in perfs:
        task = db.tasks.find_one({"_id": oid(p.get("task_id", ""))})
        if not task:
            continue
        topic = task.get("topic", "Unknown")
        if topic not in topic_map:
            topic_map[topic] = {"correct": 0, "total": 0, "xp": 0, "task_types": set()}
        topic_map[topic]["total"] += 1
        if p.get("is_correct"):
            topic_map[topic]["correct"] += 1
            topic_map[topic]["xp"] += p.get("xp_earned", 0)
        topic_map[topic]["task_types"].add(task.get("task_type", "mcq"))

    topics_out = []
    for topic, stats in topic_map.items():
        acc = round((stats["correct"] / stats["total"]) * 100) if stats["total"] else 0
        if acc < 50:
            status = "weak"
        elif acc < 75:
            status = "ok"
        else:
            status = "strong"
        topics_out.append({
            "topic":      topic,
            "accuracy":   acc,
            "attempts":   stats["total"],
            "correct":    stats["correct"],
            "xp":         stats["xp"],
            "task_types": list(stats["task_types"]),
            "status":     status,
        })

    topics_out.sort(key=lambda x: x["accuracy"])
    decay_preview = get_decay_preview(db, uid, course_id)

    return {
        "overall_score": overall_score,
        "skill_label":   _skill_label(overall_score),
        "topics":        topics_out,
        "topic_count":   len(topics_out),
        "weak_count":    sum(1 for t in topics_out if t["status"] == "weak"),
        "ok_count":      sum(1 for t in topics_out if t["status"] == "ok"),
        "strong_count":  sum(1 for t in topics_out if t["status"] == "strong"),
        "decay_preview": decay_preview,
    }


def get_decay_preview(db, uid: str, course_id: str) -> dict:
    """Returns what decay would be applied if the scheduler ran right now."""
    user = db.users.find_one({"_id": oid(uid)})
    if not user:
        return {}

    skill_score = _get_skill_score(user, course_id)
    result      = _calculate_decay(db, uid, course_id, skill_score, user)

    return {
        "current_score":   skill_score,
        "projected_decay": result["total_decay"],
        "projected_score": round(max(MIN_SCORE, skill_score - result["total_decay"]), 1),
        "breakdown":       result["breakdown"],
        "at_risk":         result["total_decay"] > 5,
    }


def run_decay_check_with_socket(db, emit_decay_alert_fn):
    """Full composite decay check — runs at midnight via scheduler."""
    print("\n[SKILL ENGINE] Running full decay check...")
    students      = list(db.users.find({"role": "student", "is_active": True}))
    total_decayed = 0

    for student in students:
        uid     = str(student["_id"])
        courses = student.get("profile", {}).get("courses", [])

        for enrollment in courses:
            course_id   = str(enrollment.get("course_id", ""))
            skill_score = float(enrollment.get("skill_score", 100))
            if not course_id:
                continue

            result = _calculate_decay(db, uid, course_id, skill_score, student)
            if result["total_decay"] <= 0:
                continue

            new_score = round(max(MIN_SCORE, skill_score - result["total_decay"]), 1)
            _save_skill_score(db, uid, course_id, new_score)
            total_decayed += 1

            course      = db.courses.find_one({"_id": oid(course_id)})
            course_name = course.get("name", "your course") if course else "your course"

            db.skill_decay_logs.insert_one(make_decay_log(
                user_id=uid, course_id=course_id, decay_type="composite",
                decay_amount=result["total_decay"], previous_score=skill_score,
                new_score=new_score, breakdown=result["breakdown"],
            ))

            _send_decay_notification(db, uid, course_name, skill_score,
                                     new_score, result["breakdown"])
            try:
                emit_decay_alert_fn(uid, course_name, skill_score, new_score)
            except Exception as e:
                print(f"[SOCKET] Alert failed for uid={uid}: {e}")

            if new_score <= RECOVERY_TASK_THRESHOLD:
                _assign_recovery_tasks(db, uid, course_id, new_score)

    print(f"[SKILL ENGINE] Done — {total_decayed} score(s) decayed")
    return total_decayed


# =============================================================================
# CORE DECAY CALCULATOR
# =============================================================================

def _calculate_decay(db, uid: str, course_id: str,
                     current_score: float, user: dict) -> dict:
    breakdown = {}

    days_inactive  = _get_days_inactive(db, uid, course_id)
    inactivity_pts = _inactivity_decay(days_inactive)
    breakdown["inactivity"] = {"days": days_inactive, "raw": inactivity_pts}

    streak_len  = _get_failure_streak(db, uid, course_id)
    failure_pts = _failure_streak_decay(streak_len)
    breakdown["failure_streak"] = {"streak": streak_len, "raw": failure_pts}

    weak_topics = _get_weak_topics(db, uid, course_id)
    topic_pts   = min(len(weak_topics), TOPIC_WEAK_MAX_TOPICS) * TOPIC_WEAK_PENALTY
    breakdown["topic_weakness"] = {"weak_topics": weak_topics, "raw": topic_pts}

    weekly_avg = _get_weekly_accuracy(db, uid, course_id)
    weekly_pts = _weekly_decay(weekly_avg)
    breakdown["weekly_avg"] = {"accuracy": weekly_avg, "raw": weekly_pts}

    skipped_days = _get_skipped_days(db, uid, course_id)
    skip_pts     = min(skipped_days, SKIP_MAX_DAYS) * SKIP_PENALTY_PER_DAY
    breakdown["skipped_days"] = {"count": skipped_days, "raw": skip_pts}

    weighted = (
        inactivity_pts * WEIGHT_TIME    +
        failure_pts    * WEIGHT_FAILURE +
        topic_pts      * WEIGHT_TOPIC   +
        weekly_pts     * WEIGHT_WEEKLY  +
        skip_pts       * WEIGHT_SKIP
    )

    activity_streak  = int(user.get("profile", {}).get("current_streak", 0))
    streak_reduction = min(activity_streak * STREAK_REDUCTION_PER_DAY, STREAK_MAX_REDUCTION)
    weighted         = weighted * (1 - streak_reduction)
    breakdown["streak_protection"] = {
        "streak":        activity_streak,
        "reduction_pct": round(streak_reduction * 100),
    }

    total = min(round(weighted, 1), MAX_DECAY_PER_RUN)
    return {"total_decay": total, "breakdown": breakdown}


def _inactivity_decay(days: int) -> float:
    for i, (low, high, pts) in enumerate(INACTIVITY_TABLE):
        if low <= days < high:
            band_size = high - low
            progress  = (days - low) / band_size if band_size > 0 else 1.0
            if i + 1 < len(INACTIVITY_TABLE):
                next_pts = INACTIVITY_TABLE[i + 1][2]
            else:
                next_pts = pts
            return pts + (next_pts - pts) * progress
    return 30.0


def _failure_streak_decay(streak: int) -> float:
    penalty = 0.0
    for threshold, pts in sorted(FAILURE_STREAK_TABLE.items()):
        if streak >= threshold:
            penalty = float(pts)
    return penalty


def _weekly_decay(accuracy) -> float:
    if accuracy is None or accuracy >= WEEKLY_LOW_THRESHOLD:
        return 0.0
    gap = WEEKLY_LOW_THRESHOLD - accuracy
    return min(WEEKLY_BASE_PENALTY, round(gap / 10, 1))


def _get_days_inactive(db, uid: str, course_id: str) -> int:
    last = db.test_sessions.find_one(
        {"user_id": uid, "course_id": course_id, "completed": True},
        sort=[("submitted_at", -1)],
    )
    if not last or not last.get("submitted_at"):
        user = db.users.find_one({"_id": oid(uid)})
        for c in (user.get("profile") or {}).get("courses", []):
            if str(c.get("course_id")) == course_id:
                enrolled = c.get("enrolled_at")
                if enrolled:
                    # FIX: use _parse_dt to handle 'Z' suffix safely
                    enrolled = _parse_dt(enrolled)
                    if enrolled is None:
                        return 0
                    return (datetime.utcnow() - enrolled).days
        return 0

    # FIX: use _parse_dt to handle 'Z' suffix safely
    last_active = _parse_dt(last["submitted_at"])
    if last_active is None:
        return 0
    return (datetime.utcnow() - last_active).days


def _get_failure_streak(db, uid: str, course_id: str) -> int:
    """
    Returns the number of consecutive test sessions where the student
    scored below PASS_THRESHOLD (60%), starting from the most recent.
    Counts sessions, not individual wrong answers.
    """
    recent_sessions = list(db.test_sessions.find(
        {"user_id": uid, "course_id": course_id, "completed": True},
        sort=[("submitted_at", -1)],
        limit=10,
    ))
    streak = 0
    for session in recent_sessions:
        if session.get("percent", 100) < PASS_THRESHOLD:
            streak += 1
        else:
            break
    return streak


def _get_weak_topics(db, uid: str, course_id: str) -> list:
    perfs = list(db.performances.find({"user_id": uid, "course_id": course_id}))
    topic_map = {}
    for p in perfs:
        task = db.tasks.find_one({"_id": oid(p.get("task_id", ""))})
        if not task:
            continue
        topic = task.get("topic", "Unknown")
        if topic not in topic_map:
            topic_map[topic] = {"correct": 0, "total": 0}
        topic_map[topic]["total"] += 1
        if p.get("is_correct"):
            topic_map[topic]["correct"] += 1

    weak = []
    for topic, stats in topic_map.items():
        if stats["total"] < TOPIC_WEAK_MIN_ATTEMPTS:
            continue
        acc = stats["correct"] / stats["total"]
        if acc < TOPIC_WEAK_ACCURACY:
            weak.append({"topic": topic, "accuracy": round(acc * 100)})

    weak.sort(key=lambda x: x["accuracy"])
    return weak[:TOPIC_WEAK_MAX_TOPICS]


def _get_weekly_accuracy(db, uid: str, course_id: str):
    week_ago = datetime.utcnow() - timedelta(days=7)
    perfs = list(db.performances.find({
        "user_id":      uid,
        "course_id":    course_id,
        "submitted_at": {"$gte": week_ago},
    }))
    if len(perfs) < 3:
        return None
    correct = sum(1 for p in perfs if p.get("is_correct"))
    return round((correct / len(perfs)) * 100, 1)


def _get_skipped_days(db, uid: str, course_id: str) -> int:
    """
    Count how many of the last 7 IST calendar days had no completed test session.
    Uses IST day boundaries converted to UTC for MongoDB comparison.
    """
    skipped = 0
    now_ist = datetime.now(IST)

    for days_ago in range(1, 8):
        ist_day_start = (now_ist - timedelta(days=days_ago)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        ist_day_end = ist_day_start + timedelta(days=1)

        day_start_utc = ist_day_start.astimezone(timezone.utc).replace(tzinfo=None)
        day_end_utc   = ist_day_end.astimezone(timezone.utc).replace(tzinfo=None)

        submitted = db.test_sessions.count_documents({
            "user_id":      uid,
            "course_id":    course_id,
            "completed":    True,
            "submitted_at": {"$gte": day_start_utc, "$lt": day_end_utc},
        })
        if submitted == 0:
            skipped += 1

    return skipped


def _assign_recovery_tasks(db, uid: str, course_id: str, current_score: float):
    """Assigns recovery tasks when score drops below threshold."""
    today        = datetime.utcnow().date().isoformat()
    is_critical  = current_score <= CRITICAL_THRESHOLD
    target_count = 3 if is_critical else 1

    already = db.task_assignments.count_documents({
        "user_id":       uid,
        "course_id":     course_id,
        "is_recovery":   True,
        "assigned_date": today,
    })
    if already >= target_count:
        return

    weak_topics  = _get_weak_topics(db, uid, course_id)
    topic_filter = [w["topic"] for w in weak_topics] if weak_topics else []

    query = {"course_id": course_id, "is_recovery": True, "status": "approved"}
    if topic_filter:
        query["topic"] = {"$in": topic_filter}

    recovery_tasks = list(db.tasks.find(query).limit(target_count))
    if not recovery_tasks:
        recovery_tasks = list(db.tasks.find({
            "course_id":   course_id,
            "is_recovery": True,
            "status":      "approved",
        }).limit(target_count))

    for task in recovery_tasks:
        db.task_assignments.insert_one({
            "user_id":       uid,
            "task_id":       str(task["_id"]),
            "course_id":     course_id,
            "assigned_date": today,
            "status":        "pending",
            "is_recovery":   True,
            "assigned_at":   datetime.utcnow(),
        })

    severity = "critical" if is_critical else "standard"
    db.notifications.insert_one(make_notification(
        user_id=uid,
        title="Recovery tasks assigned" + (" — urgent!" if is_critical else ""),
        message=(
            f"{len(recovery_tasks)} recovery task(s) assigned to rebuild your "
            f"skill score ({severity} mode, score: {current_score:.1f}). "
            + (f"Focus on: {', '.join(topic_filter[:2])}." if topic_filter else "")
        ),
        notif_type="recovery",
    ))


def _get_skill_score(user: dict, course_id: str) -> float:
    for c in user.get("profile", {}).get("courses", []):
        if str(c.get("course_id")) == str(course_id):
            return float(c.get("skill_score", 100))
    return 100.0


def _save_skill_score(db, uid: str, course_id: str, new_score: float):
    db.users.update_one(
        {"_id": oid(uid), "profile.courses.course_id": str(course_id)},
        {"$set": {"profile.courses.$.skill_score": round(new_score, 1)}}
    )


def _skill_label(score: float) -> dict:
    if score >= 85: return {"label": "Expert",         "color": "emerald"}
    if score >= 70: return {"label": "Proficient",     "color": "blue"}
    if score >= 55: return {"label": "Developing",     "color": "yellow"}
    if score >= 40: return {"label": "Needs Practice", "color": "orange"}
    return               {"label": "Struggling",       "color": "rose"}


def _send_decay_notification(db, uid, course_name, old_score, new_score, breakdown):
    parts = []
    b = breakdown
    if b.get("inactivity", {}).get("days", 0) > 3:
        parts.append(f"{b['inactivity']['days']} days inactive")
    if b.get("failure_streak", {}).get("streak", 0) >= 3:
        parts.append(f"{b['failure_streak']['streak']} failed tests in a row")
    if b.get("topic_weakness", {}).get("weak_topics"):
        names = [t["topic"] for t in b["topic_weakness"]["weak_topics"][:2]]
        parts.append(f"weak topics: {', '.join(names)}")
    if b.get("weekly_avg", {}).get("accuracy") is not None:
        if b["weekly_avg"]["accuracy"] < WEEKLY_LOW_THRESHOLD:
            parts.append(f"weekly avg {b['weekly_avg']['accuracy']}%")
    if b.get("skipped_days", {}).get("count", 0) > 0:
        parts.append(f"{b['skipped_days']['count']} skipped day(s)")

    reason = " · ".join(parts) if parts else "performance below threshold"

    db.notifications.insert_one(make_notification(
        user_id=uid,
        title=f"Skill decay — {course_name}",
        message=(
            f"Your score dropped from {old_score:.1f} to {new_score:.1f}. "
            f"Reason: {reason}."
        ),
        notif_type="decay",
    ))