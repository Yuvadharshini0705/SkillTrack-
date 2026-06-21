# SkillTrack – MongoDB Edition

## Overview

SkillTrack is a Task-Based Skill Intelligence Monitoring and Tracking System that helps students improve their technical skills through daily tasks, performance tracking, XP rewards, and skill analytics.

## Technologies Used

* Frontend: React, Vite, Tailwind CSS
* Backend: Flask (Python)
* Database: MongoDB (PyMongo)

## Main Features

* Student and Admin Login
* Daily Task Assignment
* Skill Tracking and Analytics
* XP and Level System
* Leaderboard
* Notifications
* Skill Decay Monitoring

## MongoDB Collections

* users
* courses
* tasks
* task_assignments
* performances
* notifications
* skill_decay_logs

## Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### MongoDB

Make sure MongoDB is running on port 27017.

## Skill Decay

Students lose skill points when they are inactive or consistently perform poorly. Easier tasks are assigned when skill scores become low.

## XP System

Students earn XP by:

* Completing tasks
* Answering correctly
* Maintaining streaks
* Finishing tasks quickly

## API Modules

### Authentication

* Register
* Login
* User Profile

### Student

* Dashboard
* Tasks
* Analytics
* Leaderboard
* Notifications

### Admin

* Student Management
* Course Management
* Task Management
* Decay Monitoring

## License

MIT License – Free for educational purposes.
