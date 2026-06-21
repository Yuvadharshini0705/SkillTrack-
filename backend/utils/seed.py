"""Seed MongoDB with courses, sample tasks, and default admin user."""
from db import get_db
from models import make_user, make_course, make_task

COURSES = [
    {"name": "Full Stack Development (MERN)", "slug": "mern-stack",     "description": "MongoDB, Express, React, Node.js", "icon": "⚛️",  "color": "#61dafb"},
    {"name": "Python & Django",               "slug": "python-django",  "description": "Backend with Python & Django",      "icon": "🐍",  "color": "#3776ab"},
    {"name": "Data Science & ML",             "slug": "data-science",   "description": "Data analysis, ML, AI",            "icon": "📊",  "color": "#ff6f00"},
    {"name": "Java & Spring Boot",            "slug": "java-springboot","description": "Enterprise Java development",       "icon": "☕",  "color": "#f89820"},
    {"name": "Cloud & DevOps",                "slug": "cloud-devops",   "description": "AWS, Docker, Kubernetes, CI/CD",   "icon": "☁️",  "color": "#232f3e"},
    {"name": "Mobile (React Native)",         "slug": "react-native",   "description": "Cross-platform mobile apps",       "icon": "📱",  "color": "#61dafb"},
    {"name": "UI/UX Design",                  "slug": "ui-ux",          "description": "Figma, design thinking, UX",       "icon": "🎨",  "color": "#a855f7"},
]

SAMPLE_TASKS = [
    {
        "course_slug": "mern-stack",
        "title": "JavaScript Variable Scoping",
        "task_type": "mcq", "difficulty": "beginner", "difficulty_score": 2,
        "topic": "JavaScript Variables", "subtopic": "Variable Scoping",
        "content": {
            "question": "What will this code output?\n\nvar x = 1;\nif (true) {\n  var x = 2;\n  console.log(x);\n}\nconsole.log(x);",
            "options": ["A) 2 then 1", "B) 2 then 2", "C) 1 then 1", "D) Error"],
            "correct_option": "B", "correct_text": "2 then 2"
        },
        "solution": "B",
        "explanation": "var is function-scoped not block-scoped. The inner var x reassigns the outer x.",
        "xp_reward": 10, "time_limit": 120, "tags": ["javascript", "scoping"],
    },
    {
        "course_slug": "mern-stack",
        "title": "Debug: Array Map Returns Undefined",
        "task_type": "debug", "difficulty": "beginner", "difficulty_score": 3,
        "topic": "JS Arrays", "subtopic": "Array Methods",
        "content": {
            "buggy_code": "const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => {\n  n * 2;\n});\nconsole.log(doubled);",
            "language": "javascript", "expected_output": "[2, 4, 6, 8, 10]",
            "hints": ["Are you returning a value?", "Arrow functions with {} need explicit return"],
            "bug_count": 1
        },
        "solution": "const doubled = numbers.map(n => n * 2);",
        "explanation": "Curly braces require explicit return. Remove {} for implicit return.",
        "xp_reward": 15, "time_limit": 180, "tags": ["debug", "arrays"],
    },
    {
        "course_slug": "mern-stack",
        "title": "Build a Fibonacci Function",
        "task_type": "coding", "difficulty": "intermediate", "difficulty_score": 5,
        "topic": "JavaScript Functions", "subtopic": "Recursion",
        "content": {
            "problem": "Write fibonacci(n) that returns the nth Fibonacci number. Sequence: 0, 1, 1, 2, 3, 5, 8...",
            "starter_code": "function fibonacci(n) {\n  // Your code here\n}",
            "language": "javascript",
            "test_cases": [
                {"input": "0", "expected": "0", "description": "Base case 0"},
                {"input": "1", "expected": "1", "description": "Base case 1"},
                {"input": "10", "expected": "55", "description": "10th fibonacci"},
            ],
            "constraints": ["n >= 0"],
            "examples": [{"input": "fibonacci(6)", "output": "8", "explanation": "0,1,1,2,3,5,8"}]
        },
        "solution": "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}",
        "explanation": "Recursion with base cases for 0 and 1.",
        "xp_reward": 25, "time_limit": 600, "tags": ["recursion", "functions"],
    },
    {
        "course_slug": "python-django",
        "title": "Python List Comprehension",
        "task_type": "mcq", "difficulty": "beginner", "difficulty_score": 2,
        "topic": "Python Syntax", "subtopic": "List Comprehensions",
        "content": {
            "question": "What does [x**2 for x in range(5)] produce?",
            "options": ["A) [0, 1, 4, 9, 16]", "B) [1, 4, 9, 16, 25]", "C) [0, 1, 2, 3, 4]", "D) [1, 2, 3, 4, 5]"],
            "correct_option": "A", "correct_text": "[0, 1, 4, 9, 16]"
        },
        "solution": "A",
        "explanation": "range(5) = 0,1,2,3,4. Squaring gives 0,1,4,9,16.",
        "xp_reward": 10, "time_limit": 90, "tags": ["python", "list-comprehension"],
    },
    {
        "course_slug": "mern-stack",
        "title": "Recovery: JavaScript const vs let",
        "task_type": "mcq", "difficulty": "beginner", "difficulty_score": 1,
        "topic": "JavaScript Variables", "subtopic": "Basic Concepts",
        "is_recovery": True,
        "content": {
            "question": "Which keyword declares a variable that CANNOT be reassigned?",
            "options": ["A) var", "B) let", "C) const", "D) static"],
            "correct_option": "C", "correct_text": "const",
            "encouragement": "You're doing great! Let's review the basics together."
        },
        "solution": "C",
        "explanation": "const declares a block-scoped variable that cannot be reassigned.",
        "xp_reward": 5, "time_limit": 60, "tags": ["recovery", "javascript"],
    },
    {
        "course_slug": "data-science",
        "title": "Pandas DataFrame Filtering",
        "task_type": "mcq", "difficulty": "beginner", "difficulty_score": 2,
        "topic": "Pandas DataFrames", "subtopic": "Filtering",
        "content": {
            "question": "How do you filter rows where column 'age' > 25 in a Pandas DataFrame df?",
            "options": ["A) df.filter(age > 25)", "B) df[df['age'] > 25]", "C) df.where('age > 25')", "D) df.select(df.age > 25)"],
            "correct_option": "B", "correct_text": "df[df['age'] > 25]"
        },
        "solution": "B",
        "explanation": "Boolean indexing: df[df['age'] > 25] creates a boolean mask and filters rows where age > 25.",
        "xp_reward": 10, "time_limit": 120, "tags": ["pandas", "filtering"],
    },
]


def seed_data():
    db = get_db()

    # ── Courses ───────────────────────────────────────────────────────────────
    for c in COURSES:
        if not db.courses.find_one({"slug": c["slug"]}):
            db.courses.insert_one(make_course(**c))
    print("✅ Courses seeded")

    # ── Sample tasks ──────────────────────────────────────────────────────────
    for t in SAMPLE_TASKS:
        course_slug = t.pop("course_slug")
        course = db.courses.find_one({"slug": course_slug})
        if course and not db.tasks.find_one({"title": t["title"], "course_id": str(course["_id"])}):
            doc = make_task(course_id=str(course["_id"]), **t)
            db.tasks.insert_one(doc)
    print("✅ Sample tasks seeded")

    # ── Admin user ────────────────────────────────────────────────────────────
    if not db.users.find_one({"email": "admin@skilltrack.com"}):
        admin = make_user("admin@skilltrack.com", "admin@123", role="admin")
        admin["profile"]["full_name"] = "Admin User"
        admin["profile"]["profile_completed"] = True
        db.users.insert_one(admin)
        print("✅ Admin user created  →  admin@skilltrack.com / admin@123")
    else:
        print("ℹ️  Admin already exists")
