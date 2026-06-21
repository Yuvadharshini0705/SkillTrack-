"""
db.py  —  PyMongo connection + index setup for SkillTrack v4
Cleaned: removed topic_scores, course_rules, upload_logs, generation_jobs indexes.
Only indexes that are actually used by the application are kept.
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
import os

_client = None
_db     = None


def get_db():
    global _client, _db

    if _db is None:
        uri     = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
        db_name = os.environ.get("MONGO_DB",  "skilltrack")

        _client = MongoClient(uri)
        _db     = _client[db_name]

        _ensure_indexes(_db)
        print("MongoDB connected")

    return _db


def _ensure_indexes(db):
    # ── Users ─────────────────────────────────────────────────────────────────
    db.users.create_index("email", unique=True)
    db.users.create_index([
        ("role",      ASCENDING),
        ("is_active", ASCENDING),
    ])
    db.users.create_index("profile.courses.course_id")

    # ── Tasks ─────────────────────────────────────────────────────────────────
    db.tasks.create_index([
        ("course_id",      ASCENDING),
        ("status",         ASCENDING),
        ("day_range_start",ASCENDING),
        ("day_range_end",  ASCENDING),
    ])
    db.tasks.create_index([
        ("course_id",  ASCENDING),
        ("difficulty", ASCENDING),
        ("task_type",  ASCENDING),
    ])
    db.tasks.create_index([
        ("course_id",   ASCENDING),
        ("is_recovery", ASCENDING),
        ("status",      ASCENDING),
    ])
    # Deduplication index — prevents identical tasks being inserted twice
    db.tasks.create_index([
        ("course_id",    ASCENDING),
        ("content_hash", ASCENDING),
    ])

    # ── Performances ──────────────────────────────────────────────────────────
    db.performances.create_index([
        ("user_id",   ASCENDING),
        ("course_id", ASCENDING),
    ])
    db.performances.create_index([
        ("user_id",      ASCENDING),
        ("submitted_at", DESCENDING),
    ])

    # ── Test sessions ─────────────────────────────────────────────────────────
    db.test_sessions.create_index([
        ("user_id",      ASCENDING),
        ("course_id",    ASCENDING),
        ("completed",    ASCENDING),
        ("submitted_at", DESCENDING),
    ])
    db.test_sessions.create_index([
        ("user_id",   ASCENDING),
        ("course_id", ASCENDING),
        ("day",       ASCENDING),
    ], unique=True, sparse=True)

    # ── Notifications ─────────────────────────────────────────────────────────
    db.notifications.create_index([
        ("user_id",    ASCENDING),
        ("is_read",    ASCENDING),
        ("created_at", DESCENDING),
    ])

    # ── Skill decay logs ──────────────────────────────────────────────────────
    db.skill_decay_logs.create_index([
        ("user_id",   ASCENDING),
        ("logged_at", DESCENDING),
    ])
    db.skill_decay_logs.create_index([
        ("user_id",    ASCENDING),
        ("course_id",  ASCENDING),
        ("decay_type", ASCENDING),
        ("logged_at",  DESCENDING),
    ])

    # ── Email logs ────────────────────────────────────────────────────────────
    db.email_logs.create_index([
        ("user_id",  ASCENDING),
        ("sent_at",  DESCENDING),
    ])
    db.email_logs.create_index([
        ("admin_id",    ASCENDING),
        ("created_at",  DESCENDING),
    ])

    # ── Task assignments (recovery tasks only) ────────────────────────────────
    db.task_assignments.create_index([
        ("user_id",       ASCENDING),
        ("course_id",     ASCENDING),
        ("assigned_date", ASCENDING),
    ])
    
 
    db.tasks.create_index([
        ("course_id", ASCENDING),
        ("topic",     ASCENDING),
        ("task_type", ASCENDING),
        ("status",    ASCENDING),
    ])
 