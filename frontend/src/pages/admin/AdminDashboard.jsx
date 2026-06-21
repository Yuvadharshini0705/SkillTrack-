// frontend/src/pages/admin/AdminDashboard.jsx
// Theme: Midnight Violet — dual light/dark, Bricolage Grotesque + Manrope
// Drop-in replacement — keeps AdminSidebar, replaces main content

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { useThemeStore } from "../../store/themeStore";
import {
  Users, Clock, CheckCircle, AlertTriangle, TrendingUp,
  Database, Zap, BookOpen, Activity, Shield,
  ArrowUpRight, RefreshCw,
  LucideFileClock,
  AlarmClockIcon,
  AlarmClock,
} from "lucide-react";
import { cloneElement } from "react";

// ── Helpers ─────────────────────────────────────────────────────────────────

function useThemeValues(theme) {
  const dark = theme === "dark";
  return {
    dark,
    bg:            dark ? "#09070f"          : "#f0eeff",
    surface:       dark ? "#16102a"          : "#ffffff",
    surfaceBorder: dark ? "rgba(139,92,246,0.12)" : "rgba(124,58,237,0.10)",
    textHead:      dark ? "#f0eeff"          : "#1a0e3d",
    textBody:      dark ? "#c4b5fd"          : "#3d3060",
    textMuted:     dark ? "rgba(167,139,250,0.45)" : "#8b7cb8",
    divider:       dark ? "rgba(139,92,246,0.09)" : "rgba(124,58,237,0.08)",
    accentSoft:    dark ? "rgba(124,58,237,0.14)" : "rgba(124,58,237,0.07)",
  };
}

// Mini sparkline bar chart (pure CSS, no lib)
function Spark({ values = [], color }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:28 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          width: 4, borderRadius: 2,
          height: `${Math.round((v / max) * 100)}%`,
          background: color,
          opacity: 0.25 + (i / values.length) * 0.75,
          transition: "height 0.6s ease",
        }} />
      ))}
    </div>
  );
}

// ── Card configs ──────────────────────────────────────────────────────────────

const STAT_CONFIG = [
  {
    key: "total_students",     label: "Total Students",    Icon: Users,
    light: { bg:"#ede9ff", icon:"#7c3aed", border:"rgba(124,58,237,0.15)", accent:"#7c3aed" },
    dark:  { bg:"rgba(124,58,237,0.14)", icon:"#a78bfa", border:"rgba(124,58,237,0.22)", accent:"#a78bfa" },
    spark: [2,3,2,3,3,3,3],
    trend: "+0%",
  },
  {
    key: "active_students",    label: "Active Students",   Icon: Shield,
    light: { bg:"#e6f0ff", icon:"#2563eb", border:"rgba(37,99,235,0.14)", accent:"#2563eb" },
    dark:  { bg:"rgba(37,99,235,0.12)",  icon:"#93c5fd", border:"rgba(37,99,235,0.20)", accent:"#93c5fd" },
    spark: [1,2,2,3,2,3,3],
    trend: "+0%",
  },
  {
    key: "active_students_week", label: "Active This Week", Icon: TrendingUp,
    light: { bg:"#e6faf4", icon:"#059669", border:"rgba(5,150,105,0.14)", accent:"#059669" },
    dark:  { bg:"rgba(5,150,105,0.12)", icon:"#6ee7b7", border:"rgba(5,150,105,0.20)", accent:"#6ee7b7" },
    spark: [0,1,0,1,1,0,1],
    trend: "↑ week",
  },
  {
    key: "total_tasks",        label: "Total Tasks",       Icon: Database,
    light: { bg:"#f0ebff", icon:"#7c3aed", border:"rgba(124,58,237,0.12)", accent:"#7c3aed" },
    dark:  { bg:"rgba(124,58,237,0.10)", icon:"#c4b5fd", border:"rgba(124,58,237,0.18)", accent:"#c4b5fd" },
    spark: [280,300,310,320,340,348,352],
    trend: "+26 this month",
  },
  {
    key: "pending_review",     label: "Pending Review",    Icon: Clock,
    light: { bg:"#fff7e6", icon:"#d97706", border:"rgba(217,119,6,0.18)", accent:"#d97706" },
    dark:  { bg:"rgba(217,119,6,0.12)",  icon:"#fcd34d", border:"rgba(217,119,6,0.22)", accent:"#fcd34d" },
    spark: [20,60,90,110,130,138,140],
    trend: "Needs attention",
    alert: true,
  },
  {
    key: "total_submissions",  label: "Total Submissions", Icon: CheckCircle,
    light: { bg:"#e6fbf5", icon:"#059669", border:"rgba(5,150,105,0.12)", accent:"#059669" },
    dark:  { bg:"rgba(5,150,105,0.10)", icon:"#6ee7b7", border:"rgba(5,150,105,0.18)", accent:"#6ee7b7" },
    spark: [40,52,60,68,74,81,85],
    trend: "+5 this week",
  },
  {
    key: "total_courses",      label: "Active Courses",    Icon: BookOpen,
    light: { bg:"#e6f0ff", icon:"#2563eb", border:"rgba(37,99,235,0.12)", accent:"#2563eb" },
    dark:  { bg:"rgba(37,99,235,0.10)", icon:"#93c5fd", border:"rgba(37,99,235,0.18)", accent:"#93c5fd" },
    spark: [4,5,5,6,6,7,7],
    trend: "+1 this month",
  },
  {
    key: "decay_events_week",  label: "Decay Events/Week", Icon: Activity,
    light: { bg:"#ffe6e6", icon:"#dc2626", border:"rgba(220,38,38,0.14)", accent:"#dc2626" },
    dark:  { bg:"rgba(220,38,38,0.12)", icon:"#fca5a5", border:"rgba(220,38,38,0.20)", accent:"#fca5a5" },
    spark: [5,3,4,2,3,2,2],
    trend: "↓ improving",
  },
];

const QUICK_ACTIONS = [
  { href:"/admin/tasks?status=pending", Icon:AlarmClock,      label:"Review Pending",  desc:"Approve or reject tasks",    cfgIdx:4 },
  { href:"/admin/upload",               Icon:Database,   label:"Bulk Upload",     desc:"Upload CSV tasks",           cfgIdx:3 },
  { href:"/admin/students",             Icon:Users,      label:"Manage Students", desc:"View & manage accounts",     cfgIdx:0 },
  { href:"/admin/courses",              Icon:BookOpen,   label:"Manage Courses",  desc:"Create & edit courses",      cfgIdx:6 },
  { href:"/admin/analytics",            Icon:TrendingUp, label:"Analytics",       desc:"View platform analytics",    cfgIdx:2 },
  { href:"/admin/tasks",                Icon:Zap,        label:"All Tasks",       desc:"Browse & manage all tasks",  cfgIdx:3 },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const T = useThemeValues(theme);

  const fetchStats = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const r = await api.get("/admin/dashboard");
      setStats(r.data.stats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const now = new Date().toLocaleDateString("en-GB", {
    weekday:"long", day:"numeric", month:"long", year:"numeric",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap');

        @keyframes db-fade-up   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes db-fade-in   { from{opacity:0} to{opacity:1} }
        @keyframes db-slide-lft { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes db-pulse-ring {
          0%   { transform:scale(1);   opacity:0.7; }
          70%  { transform:scale(2.2); opacity:0;   }
          100% { transform:scale(2.2); opacity:0;   }
        }
        @keyframes db-spin { to { transform:rotate(360deg); } }
        @keyframes db-shimmer {
          0%   { background-position:-200% 0; }
          100% { background-position: 200% 0; }
        }

        .db-shell   { display:flex; height:100vh; overflow:hidden; font-family:'Manrope',sans-serif; }
        .db-main    { flex:1; overflow-y:auto; transition:background 0.35s; }
        .db-main::-webkit-scrollbar        { width:4px; }
        .db-main::-webkit-scrollbar-thumb  { background:rgba(124,58,237,0.18); border-radius:4px; }

        .db-inner   { max-width:960px; margin:0 auto; padding:32px 28px 48px; }

        /* Header */
        .db-header  { margin-bottom:26px; animation:db-fade-up 0.4s ease both; }
        .db-eyebrow {
          font-size:10.5px; font-weight:800; letter-spacing:2px;
          text-transform:uppercase; margin-bottom:6px;
        }
        .db-title   {
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:34px; font-weight:800; letter-spacing:-1.2px; line-height:1;
          margin-bottom:6px;
        }
        .db-sub     { font-size:12.5px; font-weight:500; display:flex; align-items:center; gap:10px; }
        .db-live    {
          display:inline-flex; align-items:center; gap:5px;
          padding:3px 9px; border-radius:20px; font-size:10.5px; font-weight:700;
          letter-spacing:0.4px;
          background:rgba(5,150,105,0.12); color:#059669;
          border:1px solid rgba(5,150,105,0.18);
          position:relative;
        }
        .db-live-dot {
          width:6px; height:6px; border-radius:50%; background:#059669;
          position:relative;
        }
        .db-live-dot::after {
          content:''; position:absolute; inset:-1px; border-radius:50%;
          background:#059669; animation:db-pulse-ring 2s ease-out infinite;
        }

        .db-header-actions { display:flex; align-items:center; gap:10px; margin-top:12px; }
        .db-refresh {
          display:flex; align-items:center; gap:6px;
          padding:7px 14px; border-radius:9px; font-size:12px; font-weight:700;
          font-family:'Manrope',sans-serif; border:1px solid; cursor:pointer;
          transition:all 0.2s ease;
        }
        .db-refresh:hover { opacity:0.82; transform:translateY(-1px); }
        .db-refresh svg.spinning { animation:db-spin 0.8s linear infinite; }

        /* Alert */
        .db-alert {
          display:flex; align-items:center; gap:12px;
          padding:13px 18px; border-radius:13px; border:1px solid;
          margin-bottom:22px; position:relative; overflow:hidden;
          animation:db-slide-lft 0.4s ease both 0.1s;
        }
        .db-alert::before {
          content:''; position:absolute; left:0; top:0; bottom:0; width:4px;
          background:linear-gradient(180deg,#f59e0b,#d97706);
          border-radius:4px 0 0 4px;
        }
        .db-alert-count {
          font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:16px;
        }
        .db-alert-btn {
          margin-left:auto; padding:6px 14px; border-radius:8px;
          font-size:12px; font-weight:700; font-family:'Manrope',sans-serif;
          border:none; cursor:pointer; transition:all 0.18s ease; white-space:nowrap;
        }
        .db-alert-btn:hover { opacity:0.85; transform:translateY(-1px); }

        /* Section head */
        .db-sec-head {
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:15px; font-weight:800; letter-spacing:-0.3px;
          margin-bottom:14px; display:flex; align-items:center; gap:10px;
        }
        .db-sec-head::after {
          content:''; flex:1; height:1px;
        }

        /* Stats grid */
        .db-stats-grid {
          display:grid; grid-template-columns:repeat(4,1fr);
          gap:12px; margin-bottom:28px;
        }

        /* Stat card */
        .db-stat {
          border-radius:16px; padding:16px 14px 14px;
          border:1px solid; cursor:default; overflow:hidden; position:relative;
          transition:transform 0.22s ease, box-shadow 0.22s ease;
          animation:db-fade-up 0.45s ease both;
        }
        .db-stat:hover { transform:translateY(-3px); }
        .db-stat-top    { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
        .db-stat-icon   {
          width:34px; height:34px; border-radius:9px;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .db-stat-trend  { font-size:9.5px; font-weight:700; letter-spacing:0.2px; }
        .db-stat-num    {
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:32px; font-weight:800; line-height:1; letter-spacing:-1.5px;
          margin-bottom:3px;
        }
        .db-stat-lbl    { font-size:10.5px; font-weight:700; letter-spacing:0.2px; margin-bottom:10px; }
        .db-stat-spark  { /* spark container */ }

        /* Skeleton shimmer */
        .db-skeleton {
          border-radius:16px; height:130px;
          background:linear-gradient(90deg, rgba(124,58,237,0.08) 25%, rgba(124,58,237,0.14) 50%, rgba(124,58,237,0.08) 75%);
          background-size:200% 100%;
          animation:db-shimmer 1.4s ease-in-out infinite;
          border:1px solid rgba(124,58,237,0.10);
        }

        /* Quick actions */
        .db-qa-wrap {
          border-radius:16px; border:1px solid; overflow:hidden;
          animation:db-fade-up 0.5s ease both 0.2s;
        }
        .db-qa-grid { display:grid; grid-template-columns:repeat(3,1fr); }
        .db-qa-item {
          display:flex; align-items:center; gap:12px;
          padding:16px 16px; cursor:pointer; text-decoration:none;
          transition:background 0.18s ease; position:relative;
        }
        .db-qa-item:hover .db-qa-arrow { opacity:1; transform:translate(1px,-1px); }
        .db-qa-icon {
          width:34px; height:34px; border-radius:9px;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .db-qa-name { font-size:12.5px; font-weight:700; margin-bottom:2px; }
        .db-qa-desc { font-size:11px; font-weight:500; }
        .db-qa-arrow {
          position:absolute; top:12px; right:12px;
          opacity:0; transition:all 0.18s ease;
        }
      `}</style>

      <div className="db-shell" style={{ background: T.bg }}>
        <AdminSidebar />

        <main className="db-main" style={{ background: T.bg }}>
          <div className="db-inner">

            {/* ── Header ── */}
            <div className="db-header">
              <div className="db-eyebrow" style={{ color: T.textMuted }}>
                SkillTrack Intelligence Monitoring System
              </div>
              <div className="db-title" style={{ color: T.textHead }}>Admin Overview</div>
            
              <div className="db-header-actions">
                <button
                  className="db-refresh"
                  onClick={() => fetchStats(true)}
                  style={{
                    background: T.accentSoft,
                    borderColor: T.surfaceBorder,
                    color: T.dark ? "#a78bfa" : "#7c3aed",
                  }}
                >
                  <RefreshCw
                    size={13}
                    strokeWidth={2.2}
                    className={refreshing ? "spinning" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Alert ── */}
            {stats?.pending_review > 0 && (
              <div
                className="db-alert"
                style={{
                  background: T.dark ? "rgba(251,191,36,0.07)" : "#fff8ed",
                  borderColor: T.dark ? "rgba(251,191,36,0.20)" : "#f59e0b",
                }}
              >
                <AlertTriangle size={18} color={T.dark ? "#fbbf24" : "#d97706"} strokeWidth={2} style={{ flexShrink:0 }} />
                <div style={{ fontSize:13, fontWeight:500, color: T.dark ? "#fcd34d" : "#92400e" }}>
                  <span className="db-alert-count" style={{ color: T.dark ? "#fbbf24" : "#b45309" }}>
                    {stats.pending_review}
                  </span>
                  {" tasks awaiting review — action required."}
                </div>
                <button
                  className="db-alert-btn"
                  onClick={() => navigate("/admin/tasks?status=pending")}
                  style={{
                    background: T.dark ? "rgba(251,191,36,0.16)" : "#f59e0b",
                    color: T.dark ? "#fcd34d" : "#fff",
                  }}
                >
                  Review now →
                </button>
              </div>
            )}

            {/* ── Stats ── */}
            <div className="db-sec-head" style={{ color: T.textHead }}>
              Overview Metrics
              <span style={{ background: T.divider, flex:1, height:1, display:"block" }} />
            </div>

            <div className="db-stats-grid">
              {loading
                ? Array.from({ length:8 }).map((_, i) => (
                    <div key={i} className="db-skeleton" style={{ animationDelay:`${i*0.06}s` }} />
                  ))
                : STAT_CONFIG.map((cfg, i) => {
                    const c = T.dark ? cfg.dark : cfg.light;
                    const value = stats?.[cfg.key] ?? "—";
                    return (
                      <div
                        key={cfg.key}
                        className="db-stat"
                        style={{
                          background: c.bg,
                          borderColor: c.border,
                          animationDelay: `${0.06 + i * 0.04}s`,
                          boxShadow: T.dark ? "none" : `0 2px 14px ${c.border}`,
                        }}
                      >
                        <div className="db-stat-top">
                          <div
                            className="db-stat-icon"
                            style={{ background: T.dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.70)" }}
                          >
                            <cfg.Icon size={16} color={c.icon} strokeWidth={2} />
                          </div>
                          <div className="db-stat-trend" style={{ color: c.icon, opacity:0.75 }}>
                            {cfg.trend}
                          </div>
                        </div>
                        <div className="db-stat-num" style={{ color: T.textHead }}>
                          {value}
                        </div>
                        <div className="db-stat-lbl" style={{ color: T.textMuted }}>
                          {cfg.label}
                        </div>
                        <div className="db-stat-spark">
                          <Spark values={cfg.spark} color={c.icon} />
                        </div>
                        {cfg.alert && stats?.pending_review > 0 && (
                          <div style={{
                            position:"absolute", top:10, right:10,
                            width:8, height:8, borderRadius:"50%",
                            background:"#f59e0b",
                            boxShadow:"0 0 8px rgba(245,158,11,0.6)",
                          }} />
                        )}
                      </div>
                    );
                  })
              }
            </div>

            {/* ── Quick Actions ── */}
            <div className="db-sec-head" style={{ color: T.textHead }}>
              Quick Actions
              <span style={{ background: T.divider, flex:1, height:1, display:"block" }} />
            </div>

            <div
              className="db-qa-wrap"
              style={{ background: T.surface, borderColor: T.surfaceBorder }}
            >
              <div className="db-qa-grid">
                {QUICK_ACTIONS.map((qa, i) => {
                  const cfg = STAT_CONFIG[qa.cfgIdx];
                  const c = T.dark ? cfg.dark : cfg.light;
                  const isBottomRow = i >= 3;
                  const isRightEdge = i % 3 === 2;
                  return (
                    <a
                      key={qa.href}
                      className="db-qa-item"
                      href={qa.href}
                      onClick={e => { e.preventDefault(); navigate(qa.href); }}
                      style={{
                        borderTop:   isBottomRow  ? `1px solid ${T.divider}` : "none",
                        borderRight: !isRightEdge ? `1px solid ${T.divider}` : "none",
                      }}
                    >
                      <div
                        className="db-qa-icon"
                        style={{ background: c.bg }}
                      >
                        <qa.Icon size={15} color={c.icon} strokeWidth={2} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="db-qa-name" style={{ color: T.textHead }}>{qa.label}</div>
                        <div className="db-qa-desc" style={{ color: T.textMuted }}>{qa.desc}</div>
                      </div>
                      <ArrowUpRight
                        size={13}
                        color={T.dark ? "#a78bfa" : "#7c3aed"}
                        className="db-qa-arrow"
                      />
                    </a>
                  );
                })}
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}