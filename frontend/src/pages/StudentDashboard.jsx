import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import api from "../utils/api";
import Sidebar from "../components/shared/Sidebar";
import SkillRing from "../components/shared/SkillRing";
import RecoveryPanel from "../components/student/RecoveryPanel";
import {
  Zap, Trophy, CheckCircle2, Target, Flame,
  PlayCircle, BookOpen, TrendingUp, AlertCircle,
  Moon, Clock, ArrowRight, Star, ChevronUp,
  Calendar, Award, BarChart3, Sparkles, RefreshCw,
  ShieldAlert, HeartPulse, Activity, XCircle,
} from "lucide-react";

const TASK_COUNTS = { mcq: 10, debug: 4, coding: 1 };

const TYPE_COLORS = {
  mcq:    { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/25" },
  debug:  { bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/25"  },
  coding: { bg: "bg-cyan-500/15",   text: "text-cyan-400",   border: "border-cyan-500/25"   },
};

function scoreColor(score) {
  if (score >= 85) return { text: "text-emerald-400", label: "Expert",     gradient: "from-emerald-500 to-teal-500" };
  if (score >= 70) return { text: "text-blue-400",    label: "Proficient", gradient: "from-blue-500 to-cyan-500" };
  if (score >= 55) return { text: "text-yellow-400",  label: "Developing", gradient: "from-yellow-500 to-amber-500" };
  if (score >= 40) return { text: "text-orange-400",  label: "Needs Work", gradient: "from-orange-500 to-red-500" };
  return              { text: "text-rose-400",         label: "Critical",   gradient: "from-rose-500 to-pink-500" };
}

function useCountdown(secondsRemaining) {
  const [secs, setSecs] = useState(secondsRemaining || 0);
  useEffect(() => { setSecs(secondsRemaining || 0); }, [secondsRemaining]);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secs > 0]);
  return {
    hours:   Math.floor(secs / 3600),
    minutes: Math.floor((secs % 3600) / 60),
    seconds: secs % 60,
    total:   secs,
  };
}

// ── Theme-aware style helpers ─────────────────────────────────────────────────
function useThemeStyles() {
  const { theme } = useThemeStore();
  const isLight = theme === "light";
  return { isLight };
}

// ── Cooldown Card ─────────────────────────────────────────────────────────────
function CooldownCard({ course, onUnlocked }) {
  const { hours, minutes, seconds, total } = useCountdown(course.seconds_remaining || 0);
  const pad = n => String(n).padStart(2, "0");
  const sc  = scoreColor(course.skill_score || 0);
  const [checking, setChecking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const hasTriggered = useRef(false);
  const { isLight } = useThemeStyles();

  useEffect(() => {
    if (total === 0 && !hasTriggered.current && course.cooldown_active) {
      hasTriggered.current = true;
      setChecking(true);
      api.post("/student/check-unlock")
        .then((res) => {
          if (res.data.unlocked > 0) {
            setUnlocked(true);
            setTimeout(() => { if (onUnlocked) onUnlocked(); }, 2000);
          } else {
            setTimeout(() => { hasTriggered.current = false; setChecking(false); }, 30000);
          }
        })
        .catch(() => { setChecking(false); hasTriggered.current = false; })
        .finally(() => { if (!unlocked) setChecking(false); });
    }
  }, [total]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
      style={{
        background: isLight
          ? "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)"
          : "var(--bg-card)",
        border: "1px solid",
        borderColor: isLight ? "rgba(99,102,241,0.20)" : "rgba(99,102,241,0.25)",
        boxShadow: isLight
          ? "0 4px 24px rgba(79,70,229,0.10), 0 1px 0 rgba(255,255,255,0.9) inset"
          : "var(--card-shadow)",
      }}
    >
      {/* Animated top accent */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" style={{ backgroundSize: "200% auto", animation: "shimmer 3s linear infinite" }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">{course.course_icon}</span>
              <div>
                <h3 className="font-bold text-base leading-tight" style={{ fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>
                  {course.course_name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: isLight ? "rgba(5,150,105,0.10)" : "rgba(52,211,153,0.10)",
                      color: isLight ? "#059669" : "#34d399",
                      border: `1px solid ${isLight ? "rgba(5,150,105,0.20)" : "rgba(52,211,153,0.20)"}`,
                    }}
                  >
                    ✓ Day {course.passed_day} Complete
                  </span>
                </div>
              </div>
            </div>
          </div>
          <SkillRing score={course.skill_score} size={60} />
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1.5 flex-1 rounded-full" style={{ background: isLight ? "rgba(99,102,241,0.10)" : "var(--bg-card-hover)" }}>
            <div className={`h-full rounded-full bg-gradient-to-r ${sc.gradient} transition-all duration-1000`} style={{ width: `${course.skill_score}%` }} />
          </div>
          <span className={`text-xs font-semibold ${sc.text}`}>{sc.label}</span>
        </div>

        <RecoveryBanner skillScore={course.skill_score} consecFails={course.consec_fails || 0} phaseInfo={course.phase_info} isLight={isLight} />

        {unlocked ? (
          <div className="rounded-xl p-4 text-center" style={{ background: isLight ? "rgba(5,150,105,0.08)" : "rgba(52,211,153,0.10)", border: `1px solid ${isLight ? "rgba(5,150,105,0.25)" : "rgba(52,211,153,0.30)"}` }}>
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 animate-bounce" style={{ color: isLight ? "#059669" : "#34d399" }} />
            <p className="text-sm font-bold" style={{ color: isLight ? "#059669" : "#6ee7b7" }}>Day {course.next_day} Unlocked!</p>
            <p className="text-xs mt-1 opacity-70" style={{ color: isLight ? "#059669" : "#34d399" }}>Refreshing dashboard...</p>
          </div>
        ) : checking ? (
          <div className="rounded-xl p-4 text-center" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.20)" }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" style={{ color: "var(--accent-primary-light)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--accent-primary-light)" }}>Unlocking Day {course.next_day}...</p>
          </div>
        ) : (
          <div className="rounded-xl p-4" style={{ background: isLight ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.20)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 shrink-0" style={{ color: "var(--accent-primary-light)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--accent-primary-light)" }}>
                Day {course.next_day} unlocks at midnight IST
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[{ label: "HRS", value: pad(hours) }, { label: "MIN", value: pad(minutes) }, { label: "SEC", value: pad(seconds) }].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="rounded-lg px-3 py-2 min-w-[50px]" style={{
                      background: isLight ? "#f0f2ff" : "var(--bg-page)",
                      border: "1px solid rgba(99,102,241,0.20)",
                      boxShadow: isLight ? "0 2px 8px rgba(79,70,229,0.10)" : "none",
                    }}>
                      <span className="font-mono text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{unit.value}</span>
                    </div>
                    <p className="text-xs mt-1 font-medium tracking-widest" style={{ color: "var(--text-muted)" }}>{unit.label}</p>
                  </div>
                  {i < 2 && <span className="text-lg font-bold mb-4" style={{ color: "var(--text-faint)" }}>:</span>}
                </div>
              ))}
            </div>
            {total === 0 && !checking && (
              <p className="text-xs text-center mt-3 font-semibold animate-pulse" style={{ color: isLight ? "#059669" : "#34d399" }}>🎉 Unlocking now...</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{course.completed_count} test{course.completed_count !== 1 ? "s" : ""} done</span>
          </div>
          <span className={sc.text}>{course.skill_score}/100</span>
        </div>
      </div>
    </div>
  );
}

// ── Recovery Banner ───────────────────────────────────────────────────────────
function RecoveryBanner({ skillScore, consecFails, phaseInfo, isLight }) {
  const isCritical = skillScore <= 30;
  const isRecovery = skillScore < 50;
  if (!isRecovery && !consecFails) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4"
      style={{
        background: isCritical
          ? (isLight ? "rgba(220,38,38,0.06)" : "rgba(248,113,113,0.10)")
          : (isLight ? "rgba(217,119,6,0.06)"  : "rgba(251,191,36,0.10)"),
        border: `1px solid ${isCritical
          ? (isLight ? "rgba(220,38,38,0.20)" : "rgba(248,113,113,0.30)")
          : (isLight ? "rgba(217,119,6,0.20)"  : "rgba(251,191,36,0.30)")}`,
      }}
    >
      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: isCritical ? (isLight ? "#dc2626" : "#f87171") : (isLight ? "#d97706" : "#fbbf24") }} />
      <div className="min-w-0">
        <p className="text-xs font-bold" style={{ color: isCritical ? (isLight ? "#dc2626" : "#f87171") : (isLight ? "#d97706" : "#fbbf24") }}>
          {isCritical ? "Critical — Recovery Mode Active" : "Recovery Mode Active"}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {phaseInfo?.recovery_message || `Easier questions active until score passes 50. Current: ${skillScore}/100.`}
        </p>
        {consecFails >= 3 && (
          <p className="text-xs mt-1 font-semibold" style={{ color: isLight ? "#dc2626" : "#f87171" }}>
            ⚠ {consecFails} consecutive failed sessions — review weak topics.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Phase Chip ────────────────────────────────────────────────────────────────
function PhaseChip({ phaseInfo }) {
  if (!phaseInfo) return null;
  const phaseColors = {
    beginner:     "bg-teal-500/10 text-teal-400 border-teal-500/20",
    intermediate: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    advanced:     "bg-violet-500/10 text-violet-400 border-violet-500/20",
    expert:       "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  const cls = phaseColors[phaseInfo.current_phase] || phaseColors.beginner;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {phaseInfo.phase_label || phaseInfo.current_phase}
    </span>
  );
}

// ── Day Card ──────────────────────────────────────────────────────────────────
function DayCard({ course, onStart }) {
  const pendingDays = course.pending_days || [];
  const allDone     = course.test_done || pendingDays.length === 0;
  const missedDays  = pendingDays.filter(d => d < course.current_day);
  const sc          = scoreColor(course.skill_score || 0);
  const isUrgent    = pendingDays.length > 1;
  const isRecovery  = course.in_recovery;
  const consecFails = course.consec_fails || 0;
  const phaseInfo   = course.phase_info;
  const totalQ      = Object.values(TASK_COUNTS).reduce((a, b) => a + b, 0);
  const { isLight } = useThemeStyles();

  const accentGradient = isRecovery
    ? "from-amber-500 to-rose-500"
    : allDone ? "from-emerald-500 to-teal-500"
    : isUrgent ? "from-orange-500 to-red-500"
    : "from-indigo-500 to-violet-500";

  const borderColor = isLight
    ? isRecovery ? "rgba(217,119,6,0.25)"
      : allDone  ? "rgba(5,150,105,0.20)"
      : isUrgent ? "rgba(234,88,12,0.25)"
      : "rgba(99,102,241,0.20)"
    : isRecovery ? "rgba(251,191,36,0.30)"
      : allDone  ? "rgba(52,211,153,0.20)"
      : isUrgent ? "rgba(251,146,60,0.25)"
      : "rgba(99,102,241,0.25)";

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
      style={{
        background: isLight
          ? "linear-gradient(135deg, #ffffff 0%, #f8f7ff 100%)"
          : "var(--bg-card)",
        border: `1px solid ${borderColor}`,
        boxShadow: isLight
          ? "0 4px 24px rgba(79,70,229,0.09), 0 1px 0 rgba(255,255,255,0.9) inset"
          : "var(--card-shadow)",
      }}
    >
      {/* Animated top gradient bar */}
      <div className={`h-1 bg-gradient-to-r ${accentGradient}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">{course.course_icon}</span>
              <div>
                <h3 className="font-bold text-base leading-tight" style={{ fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>
                  {course.course_name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: isLight ? "rgba(79,70,229,0.09)" : "rgba(99,102,241,0.15)",
                      color: isLight ? "#4338ca" : "#818cf8",
                      border: `1px solid ${isLight ? "rgba(79,70,229,0.18)" : "rgba(99,102,241,0.25)"}`,
                    }}
                  >
                    Day {course.current_day}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>·</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{course.completed_count} done</span>
                  {phaseInfo && <PhaseChip phaseInfo={phaseInfo} />}
                  {isUrgent && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: isLight ? "rgba(234,88,12,0.09)" : "rgba(251,146,60,0.10)",
                        color: isLight ? "#c2410c" : "#fb923c",
                        border: `1px solid ${isLight ? "rgba(234,88,12,0.18)" : "rgba(251,146,60,0.20)"}`,
                      }}
                    >
                      {pendingDays.length} pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <SkillRing score={course.skill_score} size={60} />
        </div>

        {/* Skill bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1.5 flex-1 rounded-full" style={{ background: isLight ? "rgba(99,102,241,0.10)" : "var(--bg-card-hover)" }}>
            <div className={`h-full rounded-full bg-gradient-to-r ${sc.gradient} transition-all duration-1000`} style={{ width: `${course.skill_score}%` }} />
          </div>
          <span className={`text-xs font-semibold ${sc.text}`}>{sc.label}</span>
        </div>

        <RecoveryBanner skillScore={course.skill_score} consecFails={consecFails} phaseInfo={phaseInfo} isLight={isLight} />

        {/* Task pills */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {[
            { label: `MCQ ×${TASK_COUNTS.mcq}`,     bg: isLight ? "rgba(124,58,237,0.09)" : "rgba(167,139,250,0.15)", color: isLight ? "#7c3aed" : "#a78bfa", border: isLight ? "rgba(124,58,237,0.18)" : "rgba(167,139,250,0.25)" },
            { label: `Debug ×${TASK_COUNTS.debug}`,  bg: isLight ? "rgba(180,83,9,0.09)"   : "rgba(251,191,36,0.15)",  color: isLight ? "#b45309" : "#fbbf24",  border: isLight ? "rgba(180,83,9,0.18)"   : "rgba(251,191,36,0.25)"  },
            { label: `Coding ×${TASK_COUNTS.coding}`,bg: isLight ? "rgba(8,145,178,0.09)"  : "rgba(34,211,238,0.15)",  color: isLight ? "#0891b2" : "#22d3ee",  border: isLight ? "rgba(8,145,178,0.18)"  : "rgba(34,211,238,0.25)"  },
          ].map(pill => (
            <span key={pill.label} className="text-xs px-2 py-0.5 rounded-md font-medium transition-transform hover:scale-105"
              style={{ background: pill.bg, color: pill.color, border: `1px solid ${pill.border}` }}>
              {pill.label}
            </span>
          ))}
          {isRecovery && (
            <span className="text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
              style={{ background: isLight ? "rgba(180,83,9,0.09)" : "rgba(251,191,36,0.10)", color: isLight ? "#b45309" : "#fbbf24", border: `1px solid ${isLight ? "rgba(180,83,9,0.18)" : "rgba(251,191,36,0.25)"}` }}>
              <HeartPulse className="w-3 h-3" /> Recovery
            </span>
          )}
        </div>

        {/* All done */}
        {allDone && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: isLight ? "rgba(5,150,105,0.07)" : "rgba(52,211,153,0.08)", border: `1px solid ${isLight ? "rgba(5,150,105,0.18)" : "rgba(52,211,153,0.20)"}` }}>
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: isLight ? "#059669" : "#34d399" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: isLight ? "#059669" : "#6ee7b7" }}>All caught up!</p>
              <p className="text-xs mt-0.5" style={{ color: isLight ? "#059669" : "#34d399", opacity: 0.7 }}>Day {course.current_day + 1} unlocks at midnight IST.</p>
            </div>
          </div>
        )}

        {/* Missed days warning */}
        {!allDone && missedDays.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
            style={{ background: isLight ? "rgba(234,88,12,0.07)" : "rgba(251,146,60,0.08)", border: `1px solid ${isLight ? "rgba(234,88,12,0.18)" : "rgba(251,146,60,0.20)"}` }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: isLight ? "#c2410c" : "#fb923c" }} />
            <p className="text-xs" style={{ color: isLight ? "#c2410c" : "#fdba74" }}>
              {missedDays.length} missed day{missedDays.length > 1 ? "s" : ""} — catch up below!
            </p>
          </div>
        )}

        {/* Pending day buttons */}
        {!allDone && pendingDays.length > 0 && (
          <div className="space-y-2">
            {pendingDays.map((day) => (
              <button
                key={day}
                onClick={() => onStart(course.course_id, day)}
                className="w-full flex items-center justify-between gap-3 font-bold py-3 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5"
                style={day === course.current_day ? {
                  background: isLight
                    ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#ffffff",
                  boxShadow: isLight
                    ? "0 6px 20px rgba(79,70,229,0.35)"
                    : "0 6px 20px rgba(99,102,241,0.35)",
                  border: "none",
                } : {
                  background: isLight ? "rgba(234,88,12,0.09)" : "rgba(251,146,60,0.15)",
                  color: isLight ? "#c2410c" : "#fb923c",
                  border: `1px solid ${isLight ? "rgba(234,88,12,0.20)" : "rgba(251,146,60,0.25)"}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <PlayCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{day === course.current_day ? `Start Day ${day} Test` : `Catch up — Day ${day}`}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs opacity-60">{totalQ} Qs</span>
                  <ArrowRight className="w-4 h-4 opacity-70" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, colorVar, bgLight, bgDark, delay = 0 }) {
  const { isLight } = useThemeStyles();
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up group cursor-default"
      style={{
        background: isLight ? "#ffffff" : "var(--bg-card)",
        border: `1px solid ${isLight ? "rgba(99,102,241,0.12)" : "var(--border-soft)"}`,
        boxShadow: isLight
          ? "0 2px 16px rgba(79,70,229,0.08), 0 1px 0 rgba(255,255,255,0.9) inset"
          : "var(--card-shadow)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="rounded-xl p-2.5 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
        style={{ background: isLight ? bgLight : bgDark }}
      >
        <Icon className="w-5 h-5" style={{ color: colorVar }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold animate-count-up" style={{ fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>{value}</div>
        <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user }            = useAuthStore();
  const { theme }           = useThemeStore();
  const navigate            = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isLight = theme === "light";

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    api.get("/student/dashboard")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);
  const handleUnlocked = useCallback(() => { load(true); }, [load]);
  const handleStart = (courseId, day) => navigate(`/test/${courseId}?day=${day}`);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: "rgba(99,102,241,0.20)" }} />
          <div className="w-14 h-14 border-2 border-t-2 rounded-full animate-spin" style={{ borderColor: "rgba(99,102,241,0.20)", borderTopColor: "#6366f1" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading your dashboard...</p>
      </div>
    </div>
  );

  const profile      = data?.profile || {};
  const courses      = data?.courses || [];
  const totalPending = courses.reduce((s, c) => s + (c.pending_count || 0), 0);
  const inCooldown   = courses.filter(c => c.cooldown_active).length;
  const totalDone    = courses.reduce((s, c) => s + (c.completed_count || 0), 0);
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName    = profile?.full_name?.split(" ")[0] || "Student";
  const avgSkill     = courses.length ? Math.round(courses.reduce((s, c) => s + (c.skill_score || 0), 0) / courses.length) : 0;
  const inRecovery   = courses.filter(c => c.in_recovery).length;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>
      <Sidebar notifCount={data?.notifications_count || 0} />

      <main className="flex-1 overflow-y-auto">
        {/* Ambient background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {isLight ? (
            <>
              <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(165,180,252,0.20) 0%, transparent 70%)", animation: "light-orb-drift-a 18s ease-in-out infinite" }} />
              <div className="absolute bottom-0 left-64 w-[400px] h-[300px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(196,181,253,0.16) 0%, transparent 70%)", animation: "light-orb-drift-b 22s ease-in-out infinite" }} />
              <div className="absolute top-1/2 left-1/2 w-[600px] h-[400px] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" style={{ background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)" }} />
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 w-[600px] h-[400px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)" }} />
              <div className="absolute bottom-0 left-64 w-[400px] h-[300px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(167,139,250,0.03) 0%, transparent 70%)" }} />
            </>
          )}
        </div>

        <div className="relative max-w-5xl mx-auto p-6 space-y-7" style={{ zIndex: 1 }}>

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap animate-fade-in-up">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: isLight ? "#d97706" : "#fbbf24" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>
                {greeting},{" "}
                <span style={{
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundImage: isLight
                    ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                    : "linear-gradient(135deg, #818cf8, #a78bfa)",
                  backgroundSize: "200% auto",
                  animation: "shimmer 4s linear infinite",
                }}>
                  {firstName}
                </span>{" "}👋
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {inRecovery > 0
                  ? <span style={{ color: isLight ? "#d97706" : "#fbbf24", fontWeight: 600 }}>⚠ {inRecovery} course{inRecovery > 1 ? "s" : ""} in recovery mode — easier questions active until score passes 50.</span>
                  : inCooldown > 0 && totalPending === 0
                  ? `${inCooldown} course${inCooldown > 1 ? "s" : ""} in cooldown — unlocks at midnight IST`
                  : totalPending > 0
                  ? `You have ${totalPending} test${totalPending > 1 ? "s" : ""} waiting. Stay consistent! 💪`
                  : "You're all caught up today. Amazing work! 🎉"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {refreshing && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--accent-primary-light)" }}>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Refreshing...
                </div>
              )}
              {(profile?.current_streak || 0) > 0 && (
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
                  style={{
                    background: isLight ? "rgba(234,88,12,0.08)" : "rgba(251,146,60,0.10)",
                    border: `1px solid ${isLight ? "rgba(234,88,12,0.18)" : "rgba(251,146,60,0.20)"}`,
                    boxShadow: isLight ? "0 2px 12px rgba(234,88,12,0.12)" : "none",
                  }}
                >
                  <Flame className="w-4 h-4" style={{ color: isLight ? "#ea580c" : "#fb923c" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{profile.current_streak}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>day streak</span>
                </div>
              )}
              <button
                onClick={() => navigate("/analytics")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 hover:-translate-y-0.5"
                style={{
                  background: isLight ? "rgba(99,102,241,0.08)" : "var(--bg-card)",
                  border: `1px solid ${isLight ? "rgba(99,102,241,0.18)" : "var(--border-soft)"}`,
                  color: "var(--text-secondary)",
                  boxShadow: isLight ? "0 2px 12px rgba(79,70,229,0.08)" : "none",
                }}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Zap}          label="Total XP"        value={(profile?.total_xp || 0).toLocaleString()} colorVar={isLight ? "#d97706" : "#fbbf24"} bgLight="rgba(217,119,6,0.10)"   bgDark="rgba(251,191,36,0.10)"  delay={0}   />
            <StatCard icon={Trophy}       label="Level"           value={`Lv. ${profile?.level || 1}`}              colorVar={isLight ? "#7c3aed" : "#a78bfa"} bgLight="rgba(124,58,237,0.10)"  bgDark="rgba(167,139,250,0.10)" delay={80}  />
            <StatCard icon={CheckCircle2} label="Tests Done"      value={totalDone}                                  colorVar={isLight ? "#059669" : "#34d399"} bgLight="rgba(5,150,105,0.10)"   bgDark="rgba(52,211,153,0.10)"  delay={160} />
            <StatCard icon={Target}       label="Avg Skill Score" value={`${avgSkill}/100`}                          colorVar={isLight ? "#4338ca" : "#818cf8"} bgLight="rgba(79,70,229,0.10)"   bgDark="rgba(99,102,241,0.10)"  delay={240} />
          </div>

          {/* ── Skill Overview ── */}
          {courses.length > 0 && (
            <div
              className="rounded-2xl p-5 animate-fade-in-up"
              style={{
                background: isLight ? "#ffffff" : "var(--bg-card)",
                border: `1px solid ${isLight ? "rgba(99,102,241,0.12)" : "var(--border-soft)"}`,
                boxShadow: isLight ? "0 2px 16px rgba(79,70,229,0.07)" : "var(--card-shadow)",
                animationDelay: "300ms",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Syne',sans-serif", color: "var(--text-secondary)" }}>
                  <Award className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  Skill Overview
                </h2>
                <button onClick={() => navigate("/analytics")} className="text-xs flex items-center gap-1 transition-all hover:gap-2" style={{ color: "var(--accent-primary)" }}>
                  Details <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-3">
                {courses.map((c, i) => {
                  const sc = scoreColor(c.skill_score || 0);
                  return (
                    <div key={c.course_id} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                      <span className="text-lg shrink-0">{c.course_icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>{c.course_name}</span>
                          <span className={`text-xs font-bold ml-2 shrink-0 ${sc.text}`}>{c.skill_score}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? "rgba(99,102,241,0.10)" : "var(--bg-card-hover)" }}>
                          <div className={`h-full rounded-full bg-gradient-to-r ${sc.gradient} transition-all duration-1000`} style={{ width: `${c.skill_score}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Daily Tests ── */}
          <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>
                <BookOpen className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                Daily Tests
                {totalPending > 0 && (
                  <span className="text-sm font-normal px-2 py-0.5 rounded-full"
                    style={{ background: isLight ? "rgba(234,88,12,0.09)" : "rgba(251,146,60,0.10)", color: isLight ? "#c2410c" : "#fb923c", border: `1px solid ${isLight ? "rgba(234,88,12,0.18)" : "rgba(251,146,60,0.20)"}` }}>
                    {totalPending} pending
                  </span>
                )}
                {inCooldown > 0 && (
                  <span className="text-sm font-normal px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: isLight ? "rgba(79,70,229,0.09)" : "rgba(99,102,241,0.10)", color: isLight ? "#4338ca" : "#818cf8", border: `1px solid ${isLight ? "rgba(79,70,229,0.18)" : "rgba(99,102,241,0.20)"}` }}>
                    <Moon className="w-3 h-3" /> {inCooldown} cooldown
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Resets at midnight IST</span>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="rounded-2xl p-10 text-center"
                style={{ background: isLight ? "#ffffff" : "var(--bg-card)", border: `1px solid ${isLight ? "rgba(99,102,241,0.10)" : "var(--border-soft)"}` }}>
                <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
                <p className="font-medium" style={{ color: "var(--text-muted)" }}>No courses enrolled</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-faint)" }}>Ask your admin to enroll you in a course.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.map((c) =>
                  c.cooldown_active
                    ? <CooldownCard key={c.course_id} course={c} onUnlocked={handleUnlocked} />
                    : <DayCard key={c.course_id} course={c} onStart={handleStart} />
                )}
              </div>
            )}
          </div>

          {/* ── Recent Activity ── */}
          {data?.recent_activity?.length > 0 && (
            <div className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Syne',sans-serif", color: "var(--text-primary)" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                Recent Activity
              </h2>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: isLight ? "#ffffff" : "var(--bg-card)", border: `1px solid ${isLight ? "rgba(99,102,241,0.10)" : "var(--border-soft)"}`, boxShadow: isLight ? "0 2px 16px rgba(79,70,229,0.07)" : "var(--card-shadow)" }}>
                {data.recent_activity.slice(0, 8).map((p, i, arr) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:opacity-90"
                    style={{
                      background: "transparent",
                      borderBottom: i < arr.length - 1 ? `1px solid ${isLight ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.08)"}` : "none",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isLight ? "rgba(99,102,241,0.03)" : "rgba(99,102,241,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.is_correct ? (isLight ? "#059669" : "#34d399") : (isLight ? "#dc2626" : "#f87171") }} />
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{p.task?.title || "Task"}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {new Date(p.submitted_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {p.is_correct && p.xp_earned > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: isLight ? "#d97706" : "#fbbf24" }}>
                          <Zap className="w-3 h-3" />+{p.xp_earned}
                        </span>
                      )}
                      <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                        style={{
                          background: p.is_correct ? (isLight ? "rgba(5,150,105,0.09)" : "rgba(52,211,153,0.12)") : (isLight ? "rgba(220,38,38,0.09)" : "rgba(248,113,113,0.12)"),
                          color: p.is_correct ? (isLight ? "#059669" : "#34d399") : (isLight ? "#dc2626" : "#f87171"),
                          border: `1px solid ${p.is_correct ? (isLight ? "rgba(5,150,105,0.18)" : "rgba(52,211,153,0.20)") : (isLight ? "rgba(220,38,38,0.18)" : "rgba(248,113,113,0.20)")}`,
                        }}>
                        {p.is_correct ? "✓ Correct" : "✗ Wrong"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer motivational card ── */}
          <div
            className="rounded-2xl p-5 flex items-center gap-4 animate-fade-in-up"
            style={{
              background: isLight
                ? "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(245,243,255,0.9) 100%)"
                : "var(--bg-card)",
              border: `1px solid ${isLight ? "rgba(99,102,241,0.12)" : "var(--border-soft)"}`,
              boxShadow: isLight ? "0 2px 16px rgba(79,70,229,0.07)" : "none",
              animationDelay: "600ms",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isLight ? "rgba(217,119,6,0.10)" : "rgba(251,191,36,0.15)",
                border: `1px solid ${isLight ? "rgba(217,119,6,0.18)" : "rgba(251,191,36,0.20)"}`,
              }}
            >
              <Star className="w-5 h-5" style={{ color: isLight ? "#d97706" : "#fbbf24" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {totalPending > 0
                  ? "Complete today's tests to maintain your streak and prevent skill decay!"
                  : "Excellent work today! Come back tomorrow for your next set of challenges."}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Longest streak:{" "}
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{profile?.longest_streak || 0} days</span>
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}