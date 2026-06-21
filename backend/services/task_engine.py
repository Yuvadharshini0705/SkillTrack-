"""
services/task_engine.py  —  Rule-based Daily Task Assignment Engine
====================================================================
FIXED: Query now supports BOTH field formats:
  - "day_range_start" / "day_range_end"  (bulk upload format)
  - "day"                                (single day format)

This fixes the bug where Day 2 tasks were not loading after unlock
because the query was only checking day_range_start/day_range_end
but tasks may be stored with just "day" field.

QUESTION COUNTS PER DAY:
  MCQ    → 10 questions
  Debug  →  4 questions
  Coding →  1 question

PHASE PROGRESSION (day-based):
  Days  1 – 15  →  beginner
  Days 16 – 30  →  intermediate
  Days 31 – 60  →  advanced
  Days 61+      →  expert
"""

import random
from models import oid


# ─────────────────────────────────────────────────────────────────────────────
# Question counts per task type per day
# ─────────────────────────────────────────────────────────────────────────────
TASK_COUNTS = {
    "mcq":    10,
    "debug":  4,
    "coding": 1,
    "theory": 0,
}

ACTIVE_TASK_TYPES = ["mcq", "debug", "coding"]

# ─────────────────────────────────────────────────────────────────────────────
# Phase map
# ─────────────────────────────────────────────────────────────────────────────
PHASE_MAP = [
    (1,  15,   "beginner"),
    (16, 30,   "intermediate"),
    (31, 60,   "advanced"),
    (61, 9999, "expert"),
]

FALLBACK_DIFFICULTY = {
    "beginner":     "beginner",
    "intermediate": "beginner",
    "advanced":     "intermediate",
    "expert":       "advanced",
}

TASK_TYPE_ORDER = {"mcq": 0, "debug": 1, "coding": 2, "theory": 3}

REINFORCEMENT_RATIO = 0.60

from services.skill_engine import RECOVERY_UI_THRESHOLD


# ─────────────────────────────────────────────────────────────────────────────
# FIXED HELPER — build day query that supports BOTH field formats
# ─────────────────────────────────────────────────────────────────────────────

def _day_query(day: int) -> dict:
    """
    Returns a MongoDB $or query that matches tasks for a given day
    regardless of which field format was used when saving:

    Format 1 (bulk upload): day_range_start=N, day_range_end=N
    Format 2 (single day):  day=N

    Using $or ensures both formats are found correctly.
    """
    return {
        "$or": [
            {
                "day_range_start": day,
                "day_range_end":   day,
            },
            {
                "day": day,
            }
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def get_phase_for_day(current_day: int) -> str:
    for start, end, difficulty in PHASE_MAP:
        if start <= current_day <= end:
            return difficulty
    return "expert"


def is_in_recovery(skill_score: float, current_phase: str) -> bool:
    return skill_score < RECOVERY_UI_THRESHOLD and current_phase != "beginner"


def get_daily_tasks(
    db,
    course_id:   str,
    day:         int,
    skill_score: float,
    uid:         str = None,
) -> list:
    """
    Returns up to 15 tasks for a student's daily test:
      - 10 MCQ
      -  4 Debug
      -  1 Coding

    Selection logic (checked in order):
      1. Learning-path prerequisite override
      2. Recovery mode
      3. Normal mode
    """
    current_phase = get_phase_for_day(day)

    # ── 1. Learning-path prerequisite check ──────────────────────────────
    path_info = {"override": False, "topics_to_reinforce": [], "reason": "no_uid"}
    if uid:
        try:
            from services.learning_path import should_serve_prerequisite_tasks
            path_info = should_serve_prerequisite_tasks(db, uid, course_id, day)
        except Exception as exc:
            print(f"[TASK ENGINE] Learning path check error (non-fatal): {exc}")

    if path_info["override"] and path_info["topics_to_reinforce"]:
        tasks = _fetch_path_reinforcement_blend(
            db, course_id, day, current_phase,
            path_info["topics_to_reinforce"],
        )
        tasks.sort(key=lambda t: TASK_TYPE_ORDER.get(t.get("task_type", "mcq"), 9))
        return tasks

    # ── 2. Recovery mode ─────────────────────────────────────────────────
    recovery = is_in_recovery(skill_score, current_phase)
    if recovery:
        tasks = _fetch_recovery_blend(db, course_id, day, current_phase)
        tasks.sort(key=lambda t: TASK_TYPE_ORDER.get(t.get("task_type", "mcq"), 9))
        return tasks

    # ── 3. Normal mode ───────────────────────────────────────────────────
    tasks = _fetch_normal_tasks(db, course_id, day, current_phase)
    tasks.sort(key=lambda t: TASK_TYPE_ORDER.get(t.get("task_type", "mcq"), 9))
    return tasks


def get_phase_info(current_day: int, skill_score: float) -> dict:
    """Phase metadata for the frontend daily-test response."""
    phase    = get_phase_for_day(current_day)
    recovery = is_in_recovery(skill_score, phase)

    next_phase_day = None
    for start, end, diff in PHASE_MAP:
        if diff == phase and end < 9999:
            next_phase_day = end + 1
            break

    phase_labels = {
        "beginner":     "Foundation (Days 1–15)",
        "intermediate": "Core Skills (Days 16–30)",
        "advanced":     "Advanced (Days 31–60)",
        "expert":       "Expert (Days 61+)",
    }

    return {
        "current_phase":    phase,
        "phase_label":      phase_labels.get(phase, phase),
        "recovery_mode":    recovery,
        "next_phase_day":   next_phase_day,
        "skill_score":      skill_score,
        "question_counts":  {k: v for k, v in TASK_COUNTS.items() if v > 0},
        "total_questions":  sum(TASK_COUNTS.values()),
        "recovery_message": (
            f"Recovery mode active — easier questions mixed in "
            f"until your skill score passes {RECOVERY_UI_THRESHOLD}."
        ) if recovery else None,
    }


def get_expected_counts() -> dict:
    return {k: v for k, v in TASK_COUNTS.items() if v > 0}


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL — normal mode
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_normal_tasks(db, course_id: str, day: int, phase: str) -> list:
    selected = []

    for task_type in ACTIVE_TASK_TYPES:
        count = TASK_COUNTS[task_type]
        if count == 0:
            continue

        tasks = _find_many(db, course_id, day, task_type, phase, count)

        if len(tasks) < count and FALLBACK_DIFFICULTY[phase] != phase:
            extra = _find_many(
                db, course_id, day, task_type,
                FALLBACK_DIFFICULTY[phase],
                count - len(tasks),
                exclude_ids=[t["_id"] for t in tasks],
            )
            tasks.extend(extra)

        if len(tasks) < count:
            extra = _find_many(
                db, course_id, day, task_type, None,
                count - len(tasks),
                exclude_ids=[t["_id"] for t in tasks],
            )
            tasks.extend(extra)

        selected.extend(tasks)

    # ── FIXED: Ultimate fallback uses _day_query() ────────────────────────
    if not selected:
        day_q = _day_query(day)
        query = {
            "course_id": str(course_id),
            "status":    "approved",
            "task_type": {"$in": ACTIVE_TASK_TYPES},
            **day_q,
        }
        # $or cannot be merged with ** directly — build properly
        query = {
            "$and": [
                {"course_id": str(course_id)},
                {"status":    "approved"},
                {"task_type": {"$in": ACTIVE_TASK_TYPES}},
                day_q,
            ]
        }
        selected = list(db.tasks.find(query))

    return selected


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL — recovery mode
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_recovery_blend(db, course_id: str, day: int, current_phase: str) -> list:
    easier_phase   = FALLBACK_DIFFICULTY[current_phase]
    difficulty_map = {
        "mcq":    easier_phase,
        "debug":  easier_phase,
        "coding": current_phase,
    }
    selected = []

    for task_type in ACTIVE_TASK_TYPES:
        count       = TASK_COUNTS[task_type]
        target_diff = difficulty_map.get(task_type, easier_phase)

        tasks = _find_many(db, course_id, day, task_type, target_diff, count)

        if len(tasks) < count and target_diff != current_phase:
            extra = _find_many(
                db, course_id, day, task_type, current_phase,
                count - len(tasks),
                exclude_ids=[t["_id"] for t in tasks],
            )
            tasks.extend(extra)

        if len(tasks) < count:
            extra = _find_many(
                db, course_id, day, task_type, None,
                count - len(tasks),
                exclude_ids=[t["_id"] for t in tasks],
            )
            tasks.extend(extra)

        selected.extend(tasks)

    # ── FIXED: Ultimate fallback uses _day_query() ────────────────────────
    if not selected:
        day_q = _day_query(day)
        query = {
            "$and": [
                {"course_id": str(course_id)},
                {"status":    "approved"},
                {"task_type": {"$in": ACTIVE_TASK_TYPES}},
                day_q,
            ]
        }
        selected = list(db.tasks.find(query))

    return selected


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL — prerequisite reinforcement blend
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_path_reinforcement_blend(
    db,
    course_id:            str,
    day:                  int,
    current_phase:        str,
    topics_to_reinforce:  list,
) -> list:
    selected = []

    for task_type in ACTIVE_TASK_TYPES:
        total_needed = TASK_COUNTS[task_type]
        if total_needed == 0:
            continue

        if task_type == "coding":
            current_tasks = _find_many(db, course_id, day, task_type,
                                       current_phase, total_needed)
            if not current_tasks:
                current_tasks = _find_many(db, course_id, day, task_type,
                                           None, total_needed)
            selected.extend(current_tasks)
            continue

        reinforce_n = max(1, round(total_needed * REINFORCEMENT_RATIO))
        current_n   = total_needed - reinforce_n

        reinforce_tasks = _find_from_topics(
            db, course_id, topics_to_reinforce, task_type,
            FALLBACK_DIFFICULTY[current_phase],
            reinforce_n,
        )

        if len(reinforce_tasks) < reinforce_n:
            extra = _find_from_topics(
                db, course_id, topics_to_reinforce, task_type,
                None,
                reinforce_n - len(reinforce_tasks),
                exclude_ids=[t["_id"] for t in reinforce_tasks],
            )
            reinforce_tasks.extend(extra)

        current_tasks = _find_many(
            db, course_id, day, task_type, current_phase, current_n,
            exclude_ids=[t["_id"] for t in reinforce_tasks],
        )
        if len(current_tasks) < current_n:
            extra = _find_many(
                db, course_id, day, task_type, None,
                current_n - len(current_tasks),
                exclude_ids=[t["_id"] for t in reinforce_tasks + current_tasks],
            )
            current_tasks.extend(extra)

        combined = reinforce_tasks + current_tasks
        random.shuffle(combined)
        selected.extend(combined[:total_needed])

    if not selected:
        selected = _fetch_normal_tasks(db, course_id, day, current_phase)

    return selected


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL — query helpers  (FIXED: uses _day_query)
# ─────────────────────────────────────────────────────────────────────────────

def _find_many(
    db,
    course_id:   str,
    day:         int,
    task_type:   str,
    difficulty:  str | None = None,
    limit:       int = 1,
    exclude_ids: list = None,
) -> list:
    """
    Find up to `limit` approved tasks for a given day and type.

    FIXED: Uses $and + _day_query() to support BOTH storage formats:
      - day_range_start / day_range_end  (bulk upload)
      - day                              (single task)
    """
    and_clauses = [
        {"course_id": str(course_id)},
        {"status":    "approved"},
        {"task_type": task_type},
        _day_query(day),
    ]

    if difficulty:
        and_clauses.append({"difficulty": difficulty})

    if exclude_ids:
        and_clauses.append({"_id": {"$nin": exclude_ids}})

    query = {"$and": and_clauses}

    tasks = list(db.tasks.find(query))
    random.shuffle(tasks)
    return tasks[:limit]


def _find_from_topics(
    db,
    course_id:   str,
    topics:      list,
    task_type:   str,
    difficulty:  str | None,
    limit:       int,
    exclude_ids: list = None,
) -> list:
    """
    Find tasks matching a list of topics across ALL days.
    Used for prerequisite reinforcement.
    """
    if not topics:
        return []

    and_clauses = [
        {"course_id": str(course_id)},
        {"status":    "approved"},
        {"task_type": task_type},
        {"topic":     {"$in": topics}},
    ]

    if difficulty:
        and_clauses.append({"difficulty": difficulty})

    if exclude_ids:
        and_clauses.append({"_id": {"$nin": exclude_ids}})

    query = {"$and": and_clauses}

    tasks = list(db.tasks.find(query))
    random.shuffle(tasks)
    return tasks[:limit]