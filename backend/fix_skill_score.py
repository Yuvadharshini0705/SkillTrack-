"""
fix_skill_score.py
Run this once to update all existing students' skill_score from 75 to 100.
Usage: python fix_skill_score.py
"""

from pymongo import MongoClient
import os

# ── Connection (same as your db.py) ──────────────────────────────────────────
uri     = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
db_name = os.environ.get("MONGO_DB",  "skilltrack")

client = MongoClient(uri)
db     = client[db_name]

print(f"✅ Connected to MongoDB — database: {db_name}")

# ── Update all students with skill_score = 75 → 100 ──────────────────────────
result = db.users.update_many(
    { "profile.courses": { "$exists": True } },
    { "$set": { "profile.courses.$[elem].skill_score": 100 } },
    array_filters=[ { "elem.skill_score": { "$lte": 75 } } ]
)

print(f"✅ Done!")
print(f"   Students matched : {result.matched_count}")
print(f"   Courses updated  : {result.modified_count}")