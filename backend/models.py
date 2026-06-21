"""
models.py  —  SkillTrack v4 MongoDB document helpers
Cleaned: removed unused topic_scores, generation_jobs, upload_logs references.
"""

import hashlib
from bson import ObjectId
from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash as _check_hash


def oid(s) -> object:
    try:
        return ObjectId(s)
    except Exception:
        return None


def serialize(doc: dict) -> dict:
    if doc is None:
        return {}
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, date):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = serialize(v)
        elif isinstance(v, list):
            out[k] = [
                serialize(i) if isinstance(i, dict)
                else (str(i) if isinstance(i, ObjectId) else i)
                for i in v
            ]
        else:
            out[k] = v
    return out


def make_user(email: str, password: str, role: str = "student") -> dict:
    return {
        "email":         email.lower().strip(),
        "password_hash": generate_password_hash(password),
        "role":          role,
        "is_active":     True,
        "created_at":    datetime.utcnow(),
        # consec_fails tracks consecutive test failures per course {course_id: count}
        "consec_fails":  {},
        "profile": {
            "full_name":         "",
            "gender":            "",
            "phone":             "",
            "education":         "",
            "bio":               "",
            "date_of_birth":     None,
            "avatar_url":        "",
            "profile_completed": False,
            "current_streak":    0,
            "longest_streak":    0,
            "total_xp":          0,
            "level":             1,
            "courses":           [],
        }
    }


def check_password(user: dict, password: str) -> bool:
    return _check_hash(user["password_hash"], password)


def user_to_dict(user: dict) -> dict:
    d = serialize(user)
    d.pop("password_hash", None)
    d.pop("consec_fails",  None)
    return d


def make_course(name, slug, description="", icon="💻",
                color="#6366f1", duration_days=180) -> dict:
    return {
        "name":          name,
        "slug":          slug,
        "description":   description,
        "icon":          icon,
        "color":         color,
        "duration_days": duration_days,
        "is_active":     True,
        "created_at":    datetime.utcnow(),
    }


def _build_content_hash(course_id: str, day_range_start: int,
                        task_type: str, title: str) -> str:
    raw = f"{course_id}|{day_range_start}|{task_type}|{title.strip().lower()}"
    return hashlib.md5(raw.encode()).hexdigest()


def make_task(course_id, title, task_type, difficulty, topic,
              content=None, solution="", explanation="",
              difficulty_score=1, subtopic="",
              day_range_start=1, day_range_end=999,
              source="manual", status="approved",
              xp_reward=10, time_limit=300,
              tags=None, is_recovery=False,
              created_by="system") -> dict:
    return {
        "course_id":        str(course_id),
        "content_hash":     _build_content_hash(
                                str(course_id), day_range_start, task_type, title
                            ),
        "title":            title,
        "task_type":        task_type,
        "difficulty":       difficulty,
        "difficulty_score": difficulty_score,
        "topic":            topic,
        "subtopic":         subtopic,
        "day_range_start":  day_range_start,
        "day_range_end":    day_range_end,
        "source":           source,
        "status":           status,
        "content":          content or {},
        "solution":         solution,
        "explanation":      explanation,
        "xp_reward":        xp_reward,
        "time_limit":       time_limit,
        "tags":             tags or [],
        "is_recovery":      is_recovery,
        "created_by":       created_by,
        "created_at":       datetime.utcnow(),
    }


def make_performance(user_id, task_id, assignment_id, course_id,
                     score, is_correct, time_taken,
                     answer_given="", hints_used=0, xp_earned=0) -> dict:
    return {
        "user_id":       str(user_id),
        "task_id":       str(task_id),
        "assignment_id": str(assignment_id),
        "course_id":     str(course_id),
        "score":         score,
        "is_correct":    is_correct,
        "time_taken":    time_taken,
        "answer_given":  answer_given,
        "hints_used":    hints_used,
        "xp_earned":     xp_earned,
        "submitted_at":  datetime.utcnow(),
    }


def make_decay_log(user_id, course_id, decay_type,
                   decay_amount, previous_score, new_score,
                   breakdown: dict = None) -> dict:
    doc = {
        "user_id":           str(user_id),
        "course_id":         str(course_id),
        "decay_type":        decay_type,
        "decay_amount":      decay_amount,
        "previous_score":    previous_score,
        "new_score":         new_score,
        "recovery_assigned": False,
        "logged_at":         datetime.utcnow(),
    }
    if breakdown:
        doc["breakdown"] = breakdown
    return doc


def make_notification(user_id, title, message, notif_type="info") -> dict:
    return {
        "user_id":    str(user_id),
        "title":      title,
        "message":    message,
        "type":       notif_type,
        "is_read":    False,
        "created_at": datetime.utcnow(),
    }


def make_email_log(user_id, email_to, subject, email_type, status="sent") -> dict:
    return {
        "user_id":    str(user_id),
        "email_to":   email_to,
        "subject":    subject,
        "email_type": email_type,
        "status":     status,
        "sent_at":    datetime.utcnow(),
    }
def make_recovery_assignment(user_id, task_id, course_id, assigned_date) -> dict:
    return {
        "user_id":       str(user_id),
        "task_id":       str(task_id),
        "course_id":     str(course_id),
        "assigned_date": assigned_date,
        "status":        "pending",
        "is_recovery":   True,
        "is_correct":    None,
        "score":         None,
        "completed_at":  None,
        "assigned_at":   __import__("datetime").datetime.utcnow(),
    }