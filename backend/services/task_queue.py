"""
task_queue.py — Production-grade task generation queue

Solves:
  1. Groq rate limits (429) → exponential backoff + retry
  2. Slow generation       → sequential queue, one task at a time
  3. Generation failures   → fallback to static template bank
  4. Duplicate work        → idempotency check before generating

Architecture:
  - MongoDB collection `generation_jobs` tracks every job
  - Background thread processes jobs one at a time
  - Each individual question retried up to 3× before falling back
  - Static fallback bank guarantees students always get tasks
"""

import threading
import time
import traceback
from datetime import datetime
from bson import ObjectId

# ── Job status constants ───────────────────────────────────────────────────────
STATUS_PENDING    = "pending"
STATUS_PROCESSING = "processing"
STATUS_DONE       = "done"
STATUS_FAILED     = "failed"

# ── Rate limit config ─────────────────────────────────────────────────────────
INITIAL_BACKOFF   = 5    # seconds before first retry after 429
MAX_BACKOFF       = 120  # cap backoff at 2 minutes
BACKOFF_MULTIPLIER = 2
MAX_QUESTION_RETRIES = 3  # retries per individual question before fallback
INTER_QUESTION_DELAY = 1.5  # seconds between Groq calls to stay under rate limit

_queue_lock   = threading.Lock()
_queue_thread = None
_running      = False




def _fallback_debug(topic, subtopic, difficulty, xp) -> dict:
    # Generic JS debug — works for most web courses
    return {
        "title":       f"Debug: {subtopic} Issue",
        "description": f"Find and fix the bug in this {subtopic} code",
        "content": {
            "buggy_code": (
                "function processData(items) {\n"
                "  let results = [];\n"
                "  for (let i = 0; i <= items.length; i++) {  // Bug here\n"
                "    results.push(items[i].toUpperCase());\n"
                "  }\n"
                "  return results;\n"
                "}"
            ),
            "language":        "javascript",
            "expected_output": "Array of uppercase strings, e.g. ['HELLO', 'WORLD']",
            "hints": [
                "Check the loop boundary condition carefully",
                "Arrays are zero-indexed in JavaScript",
            ],
            "bug_count": 1,
        },
        "solution": (
            "function processData(items) {\n"
            "  let results = [];\n"
            "  for (let i = 0; i < items.length; i++) {  // Fixed: < not <=\n"
            "    results.push(items[i].toUpperCase());\n"
            "  }\n"
            "  return results;\n"
            "}"
        ),
        "explanation": (
            "The bug is `i <= items.length` which causes an off-by-one error. "
            "The last iteration accesses `items[items.length]` which is `undefined`, "
            "causing `.toUpperCase()` to throw. Fix: use `i < items.length`."
        ),
        "topic":    topic,
        "subtopic": subtopic,
        "tags":     [topic.lower().replace(" ", "-"), "debug", "fallback"],
        "xp_reward": xp,
        "_source":   "fallback",
    }


def _fallback_coding(topic, subtopic, difficulty, xp) -> dict:
    return {
        "title":       f"Code: {subtopic} Challenge",
        "description": f"Write a function related to {subtopic}",
        "content": {
            "problem": (
                f"Write a function `filterAndTransform(arr)` that takes an array of numbers, "
                f"filters out all numbers less than or equal to 0, "
                f"and returns the remaining numbers multiplied by 2.\n\n"
                f"Example: filterAndTransform([3, -1, 0, 5, 2]) → [6, 10, 4]"
            ),
            "starter_code": (
                "function filterAndTransform(arr) {\n"
                "  // Your code here\n"
                "}"
            ),
            "language": "javascript",
            "test_cases": [
                {"input": "[3, -1, 0, 5, 2]",  "expected": "[6, 10, 4]", "description": "Mixed positive and non-positive"},
                {"input": "[-1, -2, -3]",       "expected": "[]",         "description": "All non-positive"},
                {"input": "[1, 2, 3]",          "expected": "[2, 4, 6]",  "description": "All positive"},
            ],
            "constraints": ["Array length >= 0", "Numbers are integers"],
            "examples": [
                {"input": "[3, -1, 0, 5, 2]", "output": "[6, 10, 4]", "explanation": "Filter <=0, multiply rest by 2"},
            ],
        },
        "solution": (
            "function filterAndTransform(arr) {\n"
            "  return arr.filter(n => n > 0).map(n => n * 2);\n"
            "}"
        ),
        "explanation": (
            "Use `filter()` to keep only positive numbers, then `map()` to double each. "
            "This is a clean functional approach: `arr.filter(n => n > 0).map(n => n * 2)`."
        ),
        "topic":    topic,
        "subtopic": subtopic,
        "tags":     [topic.lower().replace(" ", "-"), "coding", "fallback"],
        "xp_reward": xp,
        "_source":   "fallback",
    }


def _fallback_day_info(day: int) -> tuple:
    """Fallback day info when curriculum lookup fails."""
    if day <= 15:
        return ("Fundamentals", "Core Concepts", "beginner")
    elif day <= 45:
        return ("Core Concepts", "Applied Patterns", "intermediate")
    elif day <= 90:
        return ("Advanced Topics", "Design Patterns", "advanced")
    else:
        return ("Expert Level", "Architecture & Scalability", "expert")


# =============================================================================
# JOB STATE HELPERS
# =============================================================================

def _mark_job_done(db, job_id, tasks_created: int):
    db.generation_jobs.update_one(
        {"_id": job_id},
        {"$set": {
            "status":        STATUS_DONE,
            "finished_at":   datetime.utcnow(),
            "tasks_created": tasks_created,
        }}
    )


def _mark_job_failed(db, job_id, error: str):
    db.generation_jobs.update_one(
        {"_id": job_id},
        {"$set": {
            "status":      STATUS_FAILED,
            "finished_at": datetime.utcnow(),
            "error":       error,
        }, "$inc": {"attempts": 1}}
    )


# =============================================================================
