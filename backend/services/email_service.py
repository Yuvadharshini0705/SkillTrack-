"""
services/email_service.py — SkillTrack v5 Email Notification System
====================================================================
Premium HTML email templates with cinematic dark aesthetic.
Fonts: DM Sans (body) + DM Serif Display (headings) via Google Fonts.

Configure in .env:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your@gmail.com
  SMTP_PASS=your_app_password
  EMAIL_FROM_NAME=SkillTrack
  FRONTEND_URL=http://localhost:5173
"""

import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST",       "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT",   "587"))
SMTP_USER     = os.getenv("SMTP_USER",       "")
SMTP_PASS     = os.getenv("SMTP_PASS",       "")
FROM_NAME     = os.getenv("EMAIL_FROM_NAME", "SkillTrack")
FRONTEND_URL  = os.getenv("FRONTEND_URL",    "http://localhost:5173")
EMAIL_ENABLED = bool(SMTP_USER and SMTP_PASS)


# ─────────────────────────────────────────────────────────────────────────────
# BASE TEMPLATE
# Cinematic dark — obsidian background, warm ivory text, saffron + coral accents
# DM Serif Display for headings, DM Sans for body
# ─────────────────────────────────────────────────────────────────────────────
def _wrap_html(title: str, body_html: str, accent: str = "gold") -> str:
    year = datetime.utcnow().year

    # Accent palette: gold (default), emerald (success), rose (danger), sky (info)
    palettes = {
        "gold":    {"a": "#E8C547", "b": "#C49A2B", "dim": "rgba(232,197,71,0.12)", "border": "rgba(232,197,71,0.25)"},
        "emerald": {"a": "#4ADE80", "b": "#22C55E", "dim": "rgba(74,222,128,0.10)", "border": "rgba(74,222,128,0.22)"},
        "rose":    {"a": "#FB7185", "b": "#F43F5E", "dim": "rgba(251,113,133,0.10)", "border": "rgba(251,113,133,0.22)"},
        "sky":     {"a": "#38BDF8", "b": "#0EA5E9", "dim": "rgba(56,189,248,0.10)",  "border": "rgba(56,189,248,0.22)"},
    }
    p = palettes.get(accent, palettes["gold"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
  <style>
    *{{margin:0;padding:0;box-sizing:border-box}}
    body{{background:#09090b;font-family:'DM Sans',sans-serif;color:#e8e3d9;-webkit-font-smoothing:antialiased}}
    .shell{{max-width:600px;margin:32px auto;background:#0f0f10;border-radius:20px;overflow:hidden;border:1px solid #1c1c1e}}

    /* ── Header ── */
    .hd{{position:relative;padding:44px 48px 40px;background:#0f0f10;border-bottom:1px solid #1c1c1e;overflow:hidden}}
    .hd-noise{{position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");opacity:.5}}
    .hd-glow{{position:absolute;top:-60px;right:-40px;width:280px;height:280px;background:radial-gradient(circle,{p['dim']} 0%,transparent 70%);pointer-events:none}}
    .hd-inner{{position:relative;z-index:1}}
    .logo-row{{display:flex;align-items:center;gap:10px;margin-bottom:6px}}
    .logo-mark{{width:32px;height:32px;background:{p['a']};border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:17px;color:#09090b;font-weight:400;flex-shrink:0}}
    .logo-text{{font-family:'DM Serif Display',serif;font-size:22px;color:#f5f0e8;letter-spacing:-0.3px}}
    .logo-text span{{color:{p['a']}}}
    .hd-tagline{{font-size:12px;color:#52525b;letter-spacing:.08em;text-transform:uppercase;font-weight:400;padding-left:42px}}

    /* ── Body ── */
    .bd{{padding:40px 48px}}

    /* ── Typography ── */
    .eyebrow{{font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:{p['a']};margin-bottom:10px}}
    .headline{{font-family:'DM Serif Display',serif;font-size:30px;line-height:1.2;color:#f5f0e8;margin-bottom:18px;letter-spacing:-.4px}}
    .headline em{{color:{p['a']};font-style:italic}}
    .body-text{{font-size:15px;color:#a1a1aa;line-height:1.75;margin-bottom:16px;font-weight:300}}
    .body-text strong{{color:#e8e3d9;font-weight:500}}

    /* ── Divider ── */
    .div{{border:none;border-top:1px solid #1c1c1e;margin:28px 0}}

    /* ── Stat row ── */
    .stats{{display:flex;gap:10px;margin:24px 0;flex-wrap:wrap}}
    .stat{{flex:1;min-width:110px;background:#141414;border:1px solid #1c1c1e;border-radius:14px;padding:18px 16px;text-align:center}}
    .stat-n{{font-family:'DM Serif Display',serif;font-size:30px;color:{p['a']};line-height:1;letter-spacing:-.5px}}
    .stat-l{{font-size:11px;color:#52525b;margin-top:5px;text-transform:uppercase;letter-spacing:.07em;font-weight:500}}

    /* ── Accent box (info/success/warning) ── */
    .abox{{background:{p['dim']};border:1px solid {p['border']};border-radius:14px;padding:22px 24px;margin:22px 0}}
    .abox-title{{font-family:'DM Serif Display',serif;font-size:17px;color:{p['a']};margin-bottom:8px;letter-spacing:-.2px}}
    .abox p{{font-size:14px;color:#a1a1aa;line-height:1.7;margin:0;font-weight:300}}
    .abox p strong{{color:#e8e3d9;font-weight:500}}

    /* ── Warning box ── */
    .wbox{{background:rgba(251,113,133,0.07);border:1px solid rgba(251,113,133,0.2);border-radius:14px;padding:22px 24px;margin:22px 0}}
    .wbox-title{{font-family:'DM Serif Display',serif;font-size:17px;color:#fb7185;margin-bottom:8px}}
    .wbox p{{font-size:14px;color:#a1a1aa;line-height:1.7;margin:0;font-weight:300}}
    .wbox p strong{{color:#e8e3d9;font-weight:500}}

    /* ── Success box ── */
    .sbox{{background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:14px;padding:22px 24px;margin:22px 0}}
    .sbox-title{{font-family:'DM Serif Display',serif;font-size:17px;color:#4ade80;margin-bottom:8px}}
    .sbox p{{font-size:14px;color:#a1a1aa;line-height:1.7;margin:0;font-weight:300}}
    .sbox p strong{{color:#e8e3d9;font-weight:500}}

    /* ── Skill bar ── */
    .bar-wrap{{margin:20px 0}}
    .bar-meta{{display:flex;justify-content:space-between;font-size:12px;color:#52525b;margin-bottom:7px;font-weight:500}}
    .bar-track{{background:#141414;border-radius:99px;height:6px;border:1px solid #1c1c1e;overflow:hidden}}
    .bar-fill{{height:100%;border-radius:99px;background:linear-gradient(90deg,{p['b']},{p['a']})}}

    /* ── Pill badge ── */
    .pill{{display:inline-block;padding:5px 14px;border-radius:99px;font-size:12px;font-weight:500;letter-spacing:.03em}}
    .pill-gold{{background:rgba(232,197,71,0.12);color:#E8C547;border:1px solid rgba(232,197,71,0.25)}}
    .pill-green{{background:rgba(74,222,128,0.10);color:#4ade80;border:1px solid rgba(74,222,128,0.22)}}
    .pill-red{{background:rgba(251,113,133,0.10);color:#fb7185;border:1px solid rgba(251,113,133,0.22)}}
    .pill-amber{{background:rgba(251,146,60,0.10);color:#fb923c;border:1px solid rgba(251,146,60,0.22)}}

    /* ── CTA Button ── */
    .cta-wrap{{text-align:center;margin:28px 0 8px}}
    .cta{{display:inline-block;background:{p['a']};color:#09090b !important;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-.1px}}

    /* ── Streak banner ── */
    .streak{{background:#141414;border:1px solid #1c1c1e;border-radius:14px;padding:16px 22px;margin:18px 0;display:flex;align-items:center;gap:14px}}
    .streak-flame{{font-size:28px;flex-shrink:0}}
    .streak-text{{font-size:14px;color:#a1a1aa;font-weight:300}}
    .streak-text strong{{color:#fb923c;font-weight:600}}

    /* ── Q breakdown table ── */
    .q-section{{margin:24px 0}}
    .q-head{{font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#3f3f46;margin-bottom:10px}}
    .q-table{{width:100%;border-collapse:collapse;background:#141414;border-radius:12px;overflow:hidden;border:1px solid #1c1c1e}}
    .q-table thead tr{{background:#0f0f10}}
    .q-table th{{padding:10px 14px;font-size:11px;color:#3f3f46;text-transform:uppercase;letter-spacing:.08em;font-weight:500;text-align:left}}
    .q-table th:last-child{{text-align:center}}
    .q-table td{{padding:11px 14px;font-size:13px;color:#a1a1aa;border-top:1px solid #1c1c1e;font-weight:300;vertical-align:top}}
    .q-table td:last-child{{text-align:center}}
    .q-ok{{color:#4ade80;font-size:13px;font-weight:600}}
    .q-no{{color:#fb7185;font-size:13px;font-weight:600}}
    .type-pill{{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}}
    .tp-mcq{{background:rgba(56,189,248,0.10);color:#38bdf8}}
    .tp-debug{{background:rgba(251,146,60,0.10);color:#fb923c}}
    .tp-coding{{background:rgba(167,139,250,0.10);color:#a78bfa}}
    .tp-theory{{background:rgba(74,222,128,0.10);color:#4ade80}}
    .q-expl{{font-size:12px;color:#3f3f46;padding:0 14px 10px;border-top:none !important;font-style:italic}}

    /* ── Steps list ── */
    .steps{{margin:20px 0;padding:0;list-style:none}}
    .steps li{{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #1c1c1e;font-size:14px;color:#a1a1aa;font-weight:300}}
    .steps li:last-child{{border-bottom:none}}
    .step-num{{width:22px;height:22px;border-radius:50%;background:{p['dim']};border:1px solid {p['border']};color:{p['a']};font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}}

    /* ── Account data list ── */
    .data-list{{margin:0;padding:0;list-style:none}}
    .data-list li{{padding:6px 0;font-size:13px;color:#a1a1aa;border-bottom:1px solid #1c1c1e;font-weight:300}}
    .data-list li:last-child{{border-bottom:none}}
    .data-list li strong{{color:#e8e3d9;font-weight:500}}

    /* ── Footer ── */
    .ft{{background:#0a0a0b;padding:28px 48px;border-top:1px solid #1c1c1e}}
    .ft-text{{font-size:12px;color:#3f3f46;line-height:1.8;text-align:center;font-weight:300}}
    .ft-text a{{color:#52525b;text-decoration:none}}
    .ft-text a:hover{{color:{p['a']}}}
    .ft-brand{{font-family:'DM Serif Display',serif;font-size:14px;color:#27272a;margin-bottom:8px;text-align:center}}
  </style>
</head>
<body>
  <div class="shell">
    <div class="hd">
      <div class="hd-noise"></div>
      <div class="hd-glow"></div>
      <div class="hd-inner">
        <div class="logo-row">
          <div class="logo-mark">S</div>
          <div class="logo-text">Skill<span>Track</span></div>
        </div>
        <div class="hd-tagline">Intelligent Learning Monitor</div>
      </div>
    </div>
    <div class="bd">
      {body_html}
    </div>
    <div class="ft">
      <div class="ft-brand">SkillTrack</div>
      <p class="ft-text">
        &copy; {year} SkillTrack &bull; <a href="{FRONTEND_URL}">Open App</a><br>
        You're receiving this because you're enrolled on SkillTrack.<br>
        <a href="{FRONTEND_URL}/settings">Manage preferences</a> &bull; <a href="{FRONTEND_URL}/support">Support</a>
      </p>
    </div>
  </div>
</body>
</html>"""


# ── Core Send Helper ──────────────────────────────────────────────────────────
def _send(to_email: str, subject: str, html: str) -> bool:
    if not EMAIL_ENABLED:
        print(f"[EMAIL] Disabled — would send '{subject}' to {to_email}")
        return True
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{FROM_NAME} <{SMTP_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"[EMAIL] Sent '{subject}' → {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed '{subject}' → {to_email}: {e}")
        return False


def send_email(to_email: str, subject: str, html: str, name: str = "") -> bool:
    return _send(to_email, subject, html)


def send_async(to_email: str, subject: str, html: str,
               db=None, user_id: str = "", email_type: str = "generic"):
    def _run():
        _send(to_email, subject, html)
        if db is not None and user_id:
            try:
                from models import make_email_log
                db.email_logs.insert_one(
                    make_email_log(user_id, to_email, subject, email_type)
                )
            except Exception:
                pass
    t = threading.Thread(target=_run, daemon=True)
    t.start()


def _send_in_thread(to_email: str, subject: str, html: str):
    t = threading.Thread(target=_send, args=(to_email, subject, html), daemon=True)
    t.start()


# ── Admin Broadcast ───────────────────────────────────────────────────────────
def send_admin_broadcast(recipients: list, subject: str, message: str,
                         admin_name: str = "Admin") -> dict:
    sent = failed = 0
    body = f"""
    <div class="eyebrow">Admin Message</div>
    <h1 class="headline">Message from<br><em>{admin_name}</em></h1>
    <div class="abox">
      <p style="color:#e8e3d9;font-size:15px;line-height:1.8;white-space:pre-wrap;font-weight:300;">{message}</p>
    </div>
    <p class="body-text" style="font-size:13px;">
      This message was sent to all enrolled students by your administrator.
    </p>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/dashboard" class="cta">Open SkillTrack &rarr;</a></div>
    """
    html_template = _wrap_html(subject, body, accent="sky")
    for recipient in recipients:
        email = recipient.get("email", "")
        name  = recipient.get("name", "Student")
        if not email:
            failed += 1
            continue
        personalised = html_template.replace(
            "<h1 class=\"headline\">",
            f'<p class="body-text">Hi <strong>{name}</strong>,</p>\n    <h1 class="headline">'
        )
        ok = _send(email, subject, personalised)
        sent += 1 if ok else 0
        failed += 0 if ok else 1
    return {"sent": sent, "failed": failed}


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL TEMPLATES
# ─────────────────────────────────────────────────────────────────────────────

def send_welcome_email(db, user_id: str, to_email: str, full_name: str = "Student"):
    subject    = "Welcome to SkillTrack — Your Journey Begins"
    registered = datetime.utcnow().strftime('%B %d, %Y')
    first_name = (full_name or "Student").split()[0]
    body = f"""
    <div class="eyebrow">Account Created</div>
    <h1 class="headline">Welcome,<br><em>{first_name}.</em></h1>
    <p class="body-text">
      Your SkillTrack account is live. You've joined a platform built to track,
      measure, and sharpen your skills — one day at a time.
    </p>
    <div class="abox">
      <div class="abox-title">You're all set</div>
      <p>
        <strong>{to_email}</strong><br>
        Registered on <strong>{registered}</strong>
      </p>
    </div>
    <hr class="div">
    <p class="body-text" style="font-size:13px;color:#52525b;">Your path from here</p>
    <ul class="steps">
      <li><div class="step-num">1</div>Complete your profile and choose a course</li>
      <li><div class="step-num">2</div>Take your first daily test — 15 questions, ~20 minutes</li>
      <li><div class="step-num">3</div>Watch your Skill Score grow with every session</li>
      <li><div class="step-num">4</div>Unlock new days and climb the leaderboard</li>
    </ul>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/setup" class="cta">Complete Your Profile &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent="gold")
    send_async(to_email, subject, html, db, user_id, "welcome")


def send_test_completed_email(db, user_id: str, to_email: str,
                               full_name: str, course_name: str,
                               day: int, correct: int, total: int,
                               percent: int, xp_earned: int,
                               skill_score: float, passed: bool,
                               streak: int = 0, level: int = 1,
                               results: list = None):
    results     = results or []
    first_name  = (full_name or "Student").split()[0]
    subject     = f"Day {day} Complete — {percent}% · {course_name}"
    skill_cap   = min(skill_score, 100)
    acc_palette = "emerald" if passed else ("gold" if percent >= 40 else "rose")

    score_color = "#4ade80" if percent >= 60 else "#fb923c" if percent >= 40 else "#fb7185"
    passed_pill = (
        f'<span class="pill pill-green">Passed</span>' if passed
        else f'<span class="pill pill-red">Needs Work</span>'
    )

    # Outcome box
    if passed:
        outcome = f"""
        <div class="sbox">
          <div class="sbox-title">Day {day} complete &#10003;</div>
          <p>Day {day + 1} will unlock at midnight. Keep your streak alive!</p>
        </div>"""
    else:
        outcome = """
        <div class="wbox">
          <div class="wbox-title">Don&#8217;t stop here</div>
          <p>You scored below 60%. Recovery tasks have been assigned.
          Review the explanations and go again tomorrow.</p>
        </div>"""

    # Streak banner
    streak_html = ""
    if streak >= 2:
        streak_html = f"""
        <div class="streak">
          <div class="streak-flame">&#128293;</div>
          <div class="streak-text"><strong>{streak}-day streak!</strong> You're on a roll. Don't break the chain.</div>
        </div>"""

    # Question breakdown table
    table_html = ""
    if results:
        rows = []
        for r in results[:12]:
            tt    = r.get("task_type", "mcq")
            ok    = r.get("is_correct", False)
            score = r.get("score", 0)
            title = r.get("title", "Task")[:52]
            expl  = r.get("explanation", "")
            ok_cell  = f'<span class="q-ok">&#10003;</span>' if ok else f'<span class="q-no">&#10007;</span>'
            type_cls = {"mcq": "tp-mcq", "debug": "tp-debug", "coding": "tp-coding", "theory": "tp-theory"}.get(tt, "tp-mcq")
            rows.append(
                f'<tr>'
                f'<td style="width:28px;text-align:center">{ok_cell}</td>'
                f'<td style="color:#e8e3d9">{title}</td>'
                f'<td style="text-align:center"><span class="type-pill {type_cls}">{tt}</span></td>'
                f'<td style="text-align:center;font-weight:500;color:{"#4ade80" if ok else "#fb7185"}">{score}%</td>'
                f'</tr>'
            )
            if expl and not ok:
                rows.append(
                    f'<tr class="q-expl"><td></td>'
                    f'<td colspan="3" style="color:#52525b;font-size:12px;padding-bottom:10px;font-style:italic;">{expl[:110]}</td></tr>'
                )
        table_html = f"""
        <div class="q-section">
          <div class="q-head">Question Breakdown</div>
          <table class="q-table">
            <thead><tr>
              <th style="width:28px"></th>
              <th>Question</th>
              <th style="text-align:center">Type</th>
              <th style="text-align:center">Score</th>
            </tr></thead>
            <tbody>{"".join(rows)}</tbody>
          </table>
        </div>"""

    body = f"""
    <div class="eyebrow">{course_name} &bull; Day {day}</div>
    <h1 class="headline">Day {day}<br><em>done.</em></h1>
    <p class="body-text">
      Good work, <strong>{first_name}</strong>. Here's how you did. {passed_pill}
    </p>
    <div class="stats">
      <div class="stat">
        <div class="stat-n" style="color:{score_color}">{percent}%</div>
        <div class="stat-l">Score</div>
      </div>
      <div class="stat">
        <div class="stat-n">{correct}/{total}</div>
        <div class="stat-l">Correct</div>
      </div>
      <div class="stat">
        <div class="stat-n" style="color:#fb923c">+{xp_earned}</div>
        <div class="stat-l">XP</div>
      </div>
      <div class="stat">
        <div class="stat-n" style="color:#a78bfa">{skill_score}</div>
        <div class="stat-l">Skill</div>
      </div>
    </div>
    <div class="bar-wrap">
      <div class="bar-meta"><span>Skill Score</span><span>{skill_score} / 100</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:{skill_cap}%"></div></div>
    </div>
    {streak_html}
    {outcome}
    {table_html}
    <div class="cta-wrap"><a href="{FRONTEND_URL}/analytics" class="cta">View Full Analytics &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent=acc_palette)
    send_async(to_email, subject, html, db, user_id, "test_completed")


def send_skill_decay_email(db, user_id: str, to_email: str,
                            full_name: str, course_name: str,
                            old_score: float, new_score: float,
                            decay_type: str, decay_amount: float):
    subject    = f"Skill Score Drop — {course_name}"
    first_name = (full_name or "Student").split()[0]
    drop       = round(old_score - new_score, 1)
    new_cap    = min(new_score, 100)
    is_crit    = new_score <= 45

    reason_map = {
        "time_decay":    "Inactivity — no test submitted recently",
        "failure_decay": "Consecutive low scores triggered decay",
        "composite":     "Combined factors: inactivity, topic weakness, low weekly average",
    }
    reason = reason_map.get(decay_type, "Skill decay event")

    bar_color = "linear-gradient(90deg,#f43f5e,#fb7185)" if new_score < 45 else "linear-gradient(90deg,#f59e0b,#fb923c)"
    recovery_block = ""
    if is_crit:
        recovery_block = """
        <div class="wbox">
          <div class="wbox-title">Recovery Mode Activated</div>
          <p>Your score has dropped below the critical threshold.
          Targeted recovery tasks have been assigned. Complete them first — they're calibrated to your weak areas.</p>
        </div>"""

    body = f"""
    <div class="eyebrow">Skill Alert &bull; {course_name}</div>
    <h1 class="headline">Your score<br><em>dropped.</em></h1>
    <p class="body-text">
      Hi <strong>{first_name}</strong> — your Skill Score in <strong>{course_name}</strong> decreased overnight.
    </p>
    <div class="stats">
      <div class="stat">
        <div class="stat-n" style="color:#52525b">{old_score}</div>
        <div class="stat-l">Was</div>
      </div>
      <div class="stat">
        <div class="stat-n" style="color:#fb7185">{new_score}</div>
        <div class="stat-l">Now</div>
      </div>
      <div class="stat">
        <div class="stat-n" style="color:#fb7185">&#8722;{drop}</div>
        <div class="stat-l">Drop</div>
      </div>
    </div>
    <div class="bar-wrap">
      <div class="bar-meta"><span>Current Skill Score</span><span>{new_score} / 100</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:{new_cap}%;background:{bar_color}"></div></div>
    </div>
    <div class="wbox">
      <div class="wbox-title">Why it happened</div>
      <p>{reason}</p>
    </div>
    {recovery_block}
    <div class="abox">
      <div class="abox-title">How to recover</div>
      <p>Score &#8805; 60% on your next test &bull; Complete any assigned recovery tasks &bull; Stay consistent — daily streaks reduce decay by up to 40%</p>
    </div>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/dashboard" class="cta">Start Recovery &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent="rose")
    send_async(to_email, subject, html, db, user_id, "skill_decay")


def send_skill_recovery_email(db, user_id: str, to_email: str,
                               full_name: str, course_name: str,
                               old_score: float, new_score: float):
    subject    = f"Skill Score Boosted — {course_name}"
    first_name = (full_name or "Student").split()[0]
    gain       = round(new_score - old_score, 1)
    new_cap    = min(new_score, 100)

    body = f"""
    <div class="eyebrow">Recovery &bull; {course_name}</div>
    <h1 class="headline">You're climbing<br><em>back up.</em></h1>
    <p class="body-text">
      <strong>{first_name}</strong>, your hard work is showing. Your Skill Score in
      <strong>{course_name}</strong> just increased.
    </p>
    <div class="stats">
      <div class="stat">
        <div class="stat-n" style="color:#52525b">{old_score}</div>
        <div class="stat-l">Before</div>
      </div>
      <div class="stat">
        <div class="stat-n">{new_score}</div>
        <div class="stat-l">Now</div>
      </div>
      <div class="stat">
        <div class="stat-n" style="color:#4ade80">+{gain}</div>
        <div class="stat-l">Gained</div>
      </div>
    </div>
    <div class="bar-wrap">
      <div class="bar-meta"><span>Skill Score</span><span>{new_score} / 100</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:{new_cap}%;background:linear-gradient(90deg,#22c55e,#4ade80)"></div></div>
    </div>
    <div class="sbox">
      <div class="sbox-title">Keep this momentum</div>
      <p>Stay consistent and your score will keep rising. The next daily test is the most important one.</p>
    </div>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/dashboard" class="cta">Continue Learning &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent="emerald")
    send_async(to_email, subject, html, db, user_id, "skill_recovery")


def send_day_unlocked_email(db, user_id: str, to_email: str,
                             full_name: str, course_name: str, new_day: int):
    subject    = f"Day {new_day} Unlocked — {course_name}"
    first_name = (full_name or "Student").split()[0]

    body = f"""
    <div class="eyebrow">{course_name}</div>
    <h1 class="headline">Day {new_day}<br><em>is waiting.</em></h1>
    <p class="body-text">
      <strong>{first_name}</strong>, you passed Day {new_day - 1}.
      Your next challenge is now unlocked and ready.
    </p>
    <div class="sbox">
      <div class="sbox-title">Day {new_day} unlocked &#10003;</div>
      <p>New tasks are queued. Take your Day {new_day} test to maintain your streak and keep your Skill Score climbing.</p>
    </div>
    <div class="abox">
      <div class="abox-title">What's inside</div>
      <p>10 MCQ &bull; 4 Debug challenges &bull; 1 Coding problem — curated for your progress level</p>
    </div>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/dashboard" class="cta">Take Day {new_day} Test &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent="gold")
    send_async(to_email, subject, html, db, user_id, "day_unlocked")


def send_daily_test_assigned_email(db, user_id: str, to_email: str,
                                    full_name: str, course_name: str,
                                    day: int, task_count: int,
                                    task_types: list = None):
    subject    = f"Day {day} Test Ready — {course_name}"
    first_name = (full_name or "Student").split()[0]
    task_types = task_types or []
    today_str  = datetime.utcnow().strftime('%B %d, %Y')
    task_label = "Tasks" if task_count != 1 else "Task"

    body = f"""
    <div class="eyebrow">{course_name} &bull; {today_str}</div>
    <h1 class="headline">Day {day}<br><em>test ready.</em></h1>
    <p class="body-text">
      <strong>{first_name}</strong>, your daily test is live.
      <strong>{task_count} {task_label}</strong> are waiting.
    </p>
    <div class="abox">
      <div class="abox-title">{task_count} {task_label} Today</div>
      <p>
        Course: <strong>{course_name}</strong><br>
        Date: <strong>{today_str}</strong>
      </p>
    </div>
    <ul class="steps">
      <li><div class="step-num">&#10003;</div>Complete all questions before midnight to maintain your streak</li>
      <li><div class="step-num">&#10003;</div>Score &#8805; 60% to pass and unlock tomorrow's content</li>
      <li><div class="step-num">&#10003;</div>Active streaks reduce nightly skill decay by up to 40%</li>
    </ul>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/dashboard" class="cta">Start Day {day} Test &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent="sky")
    send_async(to_email, subject, html, db, user_id, "daily_test_assigned")


def send_password_changed_email(db, user_id: str, to_email: str, full_name: str):
    subject    = "Password Changed — SkillTrack"
    first_name = (full_name or "Student").split()[0]
    changed_at = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')

    body = f"""
    <div class="eyebrow">Security Notice</div>
    <h1 class="headline">Password<br><em>updated.</em></h1>
    <p class="body-text">
      Hi <strong>{first_name}</strong>, your SkillTrack account password was just changed.
    </p>
    <div class="abox">
      <div class="abox-title">Change confirmed</div>
      <p>
        Account: <strong>{to_email}</strong><br>
        Time: <strong>{changed_at}</strong>
      </p>
    </div>
    <div class="wbox">
      <div class="wbox-title">Wasn&#8217;t you?</div>
      <p>If you didn't make this change, contact your admin immediately — your account may be compromised.</p>
    </div>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/login" class="cta">Go to Login &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent="rose")
    send_async(to_email, subject, html, db, user_id, "password_changed")


def send_account_deleted_email(to_email: str, full_name: str,
                                deleted_data: dict = None):
    subject      = "Account Deleted — SkillTrack"
    first_name   = (full_name or "User").split()[0]
    deleted_data = deleted_data or {}
    deleted_at   = datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')

    label_map = {
        "performances":  "Performance records",
        "test_sessions": "Test sessions",
        "assignments":   "Task assignments",
        "notifications": "Notifications",
        "decay_logs":    "Decay logs",
    }
    items = []
    for key, label in label_map.items():
        val = deleted_data.get(key, 0)
        if val:
            items.append(
                f'<li><strong>{label}</strong> — {val} record{"s" if val != 1 else ""} erased</li>'
            )
    data_list_html = (
        f'<ul class="data-list">{"".join(items)}</ul>' if items else
        '<p style="color:#52525b;font-size:13px;font-style:italic;">No data on record.</p>'
    )

    body = f"""
    <div class="eyebrow">Account Notice</div>
    <h1 class="headline">Account<br><em>removed.</em></h1>
    <p class="body-text">
      Hi <strong>{first_name}</strong>, your SkillTrack account associated with
      <strong>{to_email}</strong> has been permanently deleted by an administrator.
    </p>
    <div class="wbox">
      <div class="wbox-title">Permanent deletion</div>
      <p>All your data has been erased. This action cannot be undone.</p>
    </div>
    <div class="abox">
      <div class="abox-title">What was deleted</div>
      {data_list_html}
      <p style="margin-top:12px">
        Deleted by: <strong>Administrator</strong><br>
        Date: <strong>{deleted_at}</strong>
      </p>
    </div>
    <div class="cta-wrap"><a href="{FRONTEND_URL}/register" class="cta">Create New Account &rarr;</a></div>
    """
    html = _wrap_html(subject, body, accent="rose")
    _send_in_thread(to_email, subject, html)