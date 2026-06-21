# SkillTrack — MongoDB Edition
### Task-Based Skill Intelligence Monitoring & Tracking System

Full-stack AI-powered learning platform with **MongoDB** as the database.

---

## 🗄️ Database: MongoDB (Compass Compatible)

This version uses **PyMongo** — no ORM, direct MongoDB queries.

### MongoDB Collections

| Collection | Description |
|-----------|-------------|          
| `users` | Students & admins with **embedded profile + courses** |
| `courses` | 7 IT training courses |
| `tasks` | MCQ / Debug / Coding / Theory tasks |
| `task_assignments` | Daily task assignments per student |
| `performances` | Student answers, scores, XP |
| `notifications` | System alerts & messages |
| `skill_decay_logs` | Skill decay history |

### Document Structure (users collection)
```json
{
  "_id": "ObjectId",
  "email": "student@example.com",
  "password_hash": "...",
  "role": "student",
  "is_active": true,
  "created_at": "ISODate",
  "profile": {
    "full_name": "John Doe",
    "gender": "male",
    "phone": "9876543210",
    "education": "undergraduate",
    "total_xp": 350,
    "level": 4,
    "current_streak": 5,
    "longest_streak": 12,
    "profile_completed": true,
    "courses": [
      {
        "course_id": "ObjectId string",
        "course_name": "Full Stack Development (MERN)",
        "enrolled_at": "ISODate",
        "current_day": 8,
        "skill_score": 82.5,
        "last_activity": "ISODate",
        "status": "active"
      }
    ]
  }
}
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- **MongoDB running locally** (`mongod` on port 27017)
- MongoDB Compass (optional, for GUI)

### 1. Start MongoDB
```bash
# Windows
net start MongoDB

# Mac (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 2. Backend Setup
```bash
cd skilltrack/backend

python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env — add your GROQ_API_KEY (get free at console.groq.com)

python app.py
```

Backend starts at: **http://localhost:5000**
Database auto-created: **skilltrack** (visible in Compass)

### 3. Frontend Setup
```bash
cd skilltrack/frontend

npm install
npm run dev
```

Frontend starts at: **http://localhost:5173**

---

## 🔑 Default Login

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@skilltrack.com | admin@123 |
| Student | Register via /register | any 6+ chars |

---

## 🧭 MongoDB Compass — What to Expect

After first run, open Compass and connect to `mongodb://localhost:27017`.
You'll see the **skilltrack** database with these populated collections:

```
skilltrack
├── courses          (7 documents — all IT courses)
├── tasks            (6 sample tasks + any AI/manual you add)
├── users            (1 admin + any students you register)
├── task_assignments (created when students log in)
├── performances     (created when students submit answers)
├── notifications    (created on register/login events)
└── skill_decay_logs (created when skill decay is detected)
```

---

## 🤖 AI Task Generation (Groq)

1. Get free API key: [console.groq.com](https://console.groq.com)
2. Add to `backend/.env`: `GROQ_API_KEY=gsk_xxxx`
3. Go to **Admin → AI Generate**
4. Select course + day number → Generate
5. Review in **Admin → Tasks → Pending** → Approve/Reject

**Model**: `llama3-70b-8192` (free tier)
**Task types generated**: MCQ, Debug, Coding, Theory
**Difficulty**: Auto-scales with day number

---

## 🧠 Skill Decay Rules

| Rule | Trigger | Points Lost |
|------|---------|-------------|
| Inactivity 1 day | No login 1 day | −2 |
| Inactivity 2 days | No login 2 days | −5 |
| Inactivity 3 days | No login 3 days | −10 |
| Inactivity 1 week | No login 7 days | −20 |
| 3 consecutive fails | 3 wrong in a row | −3× count |
| Low weekly avg | Avg score < 60% | −(gap÷10) |

**Recovery**: Skill score < 40 → simpler tasks auto-assigned

---

## 📊 XP & Level System

| Action | XP |
|--------|----|
| Correct answer | Task reward (10–50) |
| Speed bonus (< 50% time used) | +5 |
| No hints used | +3 |
| Daily streak bonus | +5 × streak (max 10) |
| Wrong answer | +2 (participation) |

**Levels**: 1→100XP→2→250XP→3→500XP→4→900XP→5...

---

## 🔗 API Reference

### Auth
```
POST /api/auth/register    { email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me
```

### Student
```
GET  /api/student/dashboard
POST /api/student/profile/setup   { full_name, gender, phone, education, course_ids[] }
GET  /api/student/tasks/today     ?course_id=<id>
POST /api/student/tasks/submit    { assignment_id, answer, time_taken, hints_used }
GET  /api/student/analytics/<course_id>
GET  /api/student/leaderboard
GET  /api/student/notifications
POST /api/student/notifications/read
```

### Admin
```
GET  /api/admin/dashboard
GET  /api/admin/students           ?search=&page=
POST /api/admin/students/<id>/toggle
GET  /api/admin/tasks              ?status=&source=&course_id=
POST /api/admin/tasks/create
POST /api/admin/tasks/<id>/review  { action: "approve"|"reject" }
POST /api/admin/tasks/generate-ai  { course_slug, day, count }
GET  /api/admin/courses
POST /api/admin/courses
GET  /api/admin/decay-logs
```

---

## 🗂️ File Structure

```
skilltrack/
├── backend/
│   ├── app.py                  Flask app factory
│   ├── db.py                   PyMongo connection + indexes
│   ├── models.py               Document helpers (no ORM)
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── auth.py
│   │   ├── student.py
│   │   ├── admin.py
│   │   ├── tasks.py
│   │   └── performance.py
│   ├── services/
│   │   ├── ai_generator.py     Groq AI integration
│   │   ├── skill_engine.py     Decay rules + XP
│   │   └── task_engine.py      Daily assignment logic
│   └── utils/
│       └── seed.py             Auto-seeds on first run
│
└── frontend/                   React + Vite + Tailwind
    └── src/
        ├── pages/              All page components
        ├── components/         Shared + Student + Admin
        ├── store/authStore.js  Zustand auth
        └── utils/api.js        Axios instance
```

---

## 🐛 Troubleshooting

**MongoDB connection refused**
→ Make sure `mongod` is running: `mongod --dbpath /data/db`

**GROQ_API_KEY error**
→ Check `backend/.env` has `GROQ_API_KEY=gsk_...`

**CORS error in browser**
→ Flask must be on port 5000, Vite on 5173

**"No tasks today"**
→ Admin must approve tasks first (go to Admin → Tasks → Pending)

**"Profile not found" after login**
→ Complete the profile setup at /setup

---

## 📄 License
MIT — Free for educational use.
