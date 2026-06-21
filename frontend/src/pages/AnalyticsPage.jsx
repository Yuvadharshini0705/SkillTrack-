import { useState, useEffect } from "react";
import api from "../utils/api";
import Sidebar from "../components/shared/Sidebar";
import SkillRing from "../components/shared/SkillRing";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingDown, Target, CheckCircle, Clock, TrendingUp,
  BarChart2, Zap, BookOpen, Activity, Award, AlertTriangle,
  Loader2, RefreshCw,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function skillLabel(score) {
  if (score >= 85) return { label: "Expert",         color: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" };
  if (score >= 70) return { label: "Proficient",     color: "text-blue-400",    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25"         };
  if (score >= 55) return { label: "Developing",     color: "text-yellow-400",  badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"   };
  if (score >= 40) return { label: "Needs Practice", color: "text-orange-400",  badge: "bg-orange-500/15 text-orange-400 border-orange-500/25"   };
  return               { label: "Struggling",        color: "text-rose-400",    badge: "bg-rose-500/15 text-rose-400 border-rose-500/25"         };
}

function fmtTime(secs) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, suffix = "%" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-sm border border-dark-600 shadow-lg">
      {label && <p className="text-dark-400 text-xs mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#0ea5e9" }} className="font-bold">
          {p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg, sub }) {
  return (
    <div className="card flex items-center gap-3 hover:scale-[1.01] transition-transform">
      <div className={`${bg} rounded-xl p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl font-bold text-white leading-tight">{value}</div>
        <div className="text-xs text-dark-500 truncate">{label}</div>
        {sub && <div className="text-xs text-dark-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, iconColor, title, sub }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <h3 className="font-semibold text-dark-200">{title}</h3>
      {sub && <span className="text-xs text-dark-600 ml-auto">{sub}</span>}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyChart({ message, sub }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center">
        <TrendingUp className="w-6 h-6 text-primary-400" />
      </div>
      <p className="text-dark-300 text-sm font-medium">{message}</p>
      {sub && <p className="text-dark-600 text-xs max-w-xs leading-relaxed">{sub}</p>}
    </div>
  );
}

// ── Session Score Bar ──────────────────────────────────────────────────────────

function SessionBar({ session }) {
  const pct = session.percent || 0;
  const color = pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dark-500 w-12 shrink-0">Day {session.day}</span>
      <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right shrink-0 ${pct >= 60 ? "text-emerald-400" : pct >= 40 ? "text-yellow-400" : "text-rose-400"}`}>
        {pct}%
      </span>
      {session.xp > 0 && (
        <span className="text-xs text-yellow-500 flex items-center gap-0.5 w-14 shrink-0">
          <Zap className="w-3 h-3" />+{session.xp}
        </span>
      )}
    </div>
  );
}

// ── Topic Row ──────────────────────────────────────────────────────────────────

function TopicRow({ topic, isWeak }) {
  const pct = topic.accuracy;
  const color = isWeak ? "bg-rose-500/70" : pct >= 75 ? "bg-emerald-500/70" : "bg-yellow-500/70";
  const textColor = isWeak ? "text-rose-400" : pct >= 75 ? "text-emerald-400" : "text-yellow-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-dark-300 truncate">{topic.topic}</span>
          <span className={`font-semibold ${textColor} shrink-0 ml-2`}>{pct}%</span>
        </div>
        <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-xs text-dark-500 shrink-0 w-16 text-right">{topic.attempts} attempt{topic.attempts !== 1 ? "s" : ""}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data,           setData]           = useState(null);
  const [courses,        setCourses]        = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);

  // Step 1: load enrolled courses
  useEffect(() => {
    api.get("/student/dashboard")
      .then((r) => {
        const c = r.data.courses || [];
        setCourses(c);
        if (c.length > 0) setSelectedCourse(c[0]);
      })
      .catch(() => {});
  }, []);

  // Step 2: load analytics when course changes
  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    api.get(`/student/analytics/${selectedCourse.course_id}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  const refresh = () => {
    if (!selectedCourse) return;
    setRefreshing(true);
    api.get(`/student/analytics/${selectedCourse.course_id}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  // Task type bar chart
  const typeBreakdown = data?.type_stats
    ? Object.entries(data.type_stats)
        .filter(([, s]) => s.total > 0)
        .map(([type, s]) => ({
          type:     type.toUpperCase(),
          accuracy: Math.round((s.correct / s.total) * 100),
          total:    s.total,
          correct:  s.correct,
        }))
    : [];

  // Accuracy trend (last 14 days)
  const trend = (data?.trend || []).slice(-14).map((t) => ({
    ...t,
    date: new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
  }));

  // Session trend
  const sessionTrend = data?.session_trend || [];

  // Skill breakdown topics
  const breakdown = data?.skill_breakdown || {};
  const topics    = breakdown.topics || [];
  const weakTopics   = topics.filter((t) => t.status === "weak").slice(0, 5);
  const strongTopics = topics.filter((t) => t.status === "strong").slice(0, 5);

  // Pie chart data from skill breakdown
  const pieData = breakdown.topic_count > 0
    ? [
        { name: "Strong",  value: breakdown.strong_count || 0, color: "#10b981" },
        { name: "OK",      value: breakdown.ok_count    || 0, color: "#0ea5e9" },
        { name: "Weak",    value: breakdown.weak_count  || 0, color: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  const overall  = breakdown.overall_score || selectedCourse?.skill_score || 0;
  const sl       = skillLabel(overall);

  const noData = !data || data.message || data.total_tasks === 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">

          {/* ── Page Header ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
              <p className="text-dark-400 text-sm mt-1">
                Skill progression, topic mastery, and session history
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Refresh */}
              <button
                onClick={refresh}
                disabled={refreshing || loading}
                className="flex items-center gap-1.5 glass px-3 py-2 rounded-xl text-dark-400 hover:text-dark-100 text-sm transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>

              {/* Course tabs */}
              {courses.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {courses.map((c) => (
                    <button
                      key={c.course_id}
                      onClick={() => setSelectedCourse(c)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        selectedCourse?.course_id === c.course_id
                          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                          : "glass text-dark-400 hover:text-dark-200"
                      }`}
                    >
                      {c.course_icon} {c.course_name?.split(" ")[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Loading ── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <p className="text-dark-500 text-sm">Loading your analytics…</p>
            </div>

          /* ── No data yet ── */
          ) : noData ? (
            <div className="card text-center py-16 space-y-4 border border-dashed border-dark-700">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary-500/10 flex items-center justify-center">
                <BarChart2 className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <p className="text-dark-200 font-semibold text-lg">No data yet</p>
                <p className="text-dark-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
                  Complete your first daily test to unlock analytics and skill tracking.
                </p>
              </div>
            </div>

          /* ── Main content ── */
          ) : (
            <>

              {/* ── Stat Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={CheckCircle} label="Total Tasks" value={data.total_tasks}
                  color="text-primary-400" bg="bg-primary-500/10"
                />
                <StatCard
                  icon={Target} label="Overall Accuracy" value={`${data.accuracy}%`}
                  color="text-emerald-400" bg="bg-emerald-500/10"
                  sub={data.accuracy >= 60 ? "Above passing threshold" : "Below 60% threshold"}
                />
                <StatCard
                  icon={Clock} label="Avg Time / Task" value={fmtTime(data.avg_time)}
                  color="text-blue-400" bg="bg-blue-500/10"
                />
                <StatCard
                  icon={TrendingDown} label="Weak Topics" value={weakTopics.length}
                  color="text-orange-400" bg="bg-orange-500/10"
                  sub={weakTopics.length === 0 ? "None — great work!" : "Need attention"}
                />
              </div>

              {/* ── Skill Score + Accuracy Trend ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Skill Ring */}
                <div className="card flex flex-col items-center justify-center gap-3">
                  <SectionHeader icon={Award} iconColor="text-yellow-400" title="Skill Score" />
                  <SkillRing score={overall} size={160} />
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${sl.badge}`}>
                    {sl.label}
                  </span>
                  <div className="text-center">
                    <p className="text-xs text-dark-500">{selectedCourse?.course_name}</p>
                    <p className="text-xs text-dark-600 mt-0.5">Day {selectedCourse?.current_day}</p>
                  </div>
                  {/* Mini stats */}
                  <div className="flex gap-4 pt-2 border-t border-dark-700/50 w-full justify-center">
                    <div className="text-center">
                      <p className="text-sm font-bold text-dark-100">{breakdown.strong_count || 0}</p>
                      <p className="text-xs text-emerald-400">Strong</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-dark-100">{breakdown.ok_count || 0}</p>
                      <p className="text-xs text-blue-400">OK</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-dark-100">{breakdown.weak_count || 0}</p>
                      <p className="text-xs text-rose-400">Weak</p>
                    </div>
                  </div>
                </div>

                {/* Accuracy Trend */}
                <div className="lg:col-span-2 card">
                  <SectionHeader
                    icon={Activity} iconColor="text-primary-400"
                    title="7-Day Accuracy Trend"
                    sub={`${trend.length} day${trend.length !== 1 ? "s" : ""} of data`}
                  />
                  {trend.length >= 2 ? (
                    <ResponsiveContainer width="100%" height={190}>
                      <LineChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                          type="monotone" dataKey="accuracy" stroke="#0ea5e9"
                          strokeWidth={2.5} dot={{ fill: "#0ea5e9", r: 3 }}
                          activeDot={{ r: 5, fill: "#38bdf8" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart
                      message="Not enough trend data"
                      sub="Complete tests on at least 2 different days to see your accuracy trend."
                    />
                  )}
                </div>
              </div>

              {/* ── Session History + Task Type Breakdown ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Session History */}
                <div className="card">
                  <SectionHeader
                    icon={BookOpen} iconColor="text-violet-400"
                    title="Recent Test Sessions"
                    sub={sessionTrend.length > 0 ? `Last ${sessionTrend.length} sessions` : ""}
                  />
                  {sessionTrend.length > 0 ? (
                    <div className="space-y-3">
                      {sessionTrend.slice().reverse().map((s, i) => (
                        <SessionBar key={i} session={s} />
                      ))}
                    </div>
                  ) : (
                    <EmptyChart message="No sessions yet" sub="Complete your first daily test to see session history." />
                  )}
                </div>

                {/* Task Type Breakdown */}
                <div className="card">
                  <SectionHeader
                    icon={BarChart2} iconColor="text-cyan-400"
                    title="Accuracy by Task Type"
                  />
                  {typeBreakdown.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={typeBreakdown} barSize={36} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="type" tick={{ fill: "#64748b", fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                            {typeBreakdown.map((entry, i) => {
                              const colors = ["#6366f1", "#f59e0b", "#8b5cf6"];
                              return <Cell key={i} fill={colors[i % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Type stats row */}
                      <div className="flex gap-3 mt-3 pt-3 border-t border-dark-700/50">
                        {typeBreakdown.map((t, i) => {
                          const colors = ["text-indigo-400", "text-amber-400", "text-purple-400"];
                          return (
                            <div key={i} className="flex-1 text-center">
                              <p className={`text-base font-bold font-mono ${colors[i % colors.length]}`}>{t.accuracy}%</p>
                              <p className="text-xs text-dark-500">{t.type}</p>
                              <p className="text-xs text-dark-600">{t.correct}/{t.total}</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <EmptyChart message="No type data" sub="Task type breakdown appears after your first submission." />
                  )}
                </div>
              </div>

              {/* ── Weak vs Strong Topics ── */}
              {topics.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Weak Topics */}
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <h3 className="font-semibold text-dark-200">Topics Needing Attention</h3>
                      {weakTopics.length === 0 && (
                        <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          All good!
                        </span>
                      )}
                    </div>
                    {weakTopics.length > 0 ? (
                      <div className="space-y-4">
                        {weakTopics.map((t) => <TopicRow key={t.topic} topic={t} isWeak />)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Target className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-dark-200 text-sm font-medium">No weak topics!</p>
                          <p className="text-dark-500 text-xs mt-0.5">
                            You're performing well across all topics.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Strong Topics */}
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-semibold text-dark-200">Strongest Topics</h3>
                      {strongTopics.length === 0 && (
                        <span className="ml-auto text-xs text-dark-500">
                          Keep practicing!
                        </span>
                      )}
                    </div>
                    {strongTopics.length > 0 ? (
                      <div className="space-y-4">
                        {strongTopics.map((t) => <TopicRow key={t.topic} topic={t} isWeak={false} />)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-4">
                        <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-dark-200 text-sm font-medium">No strong topics yet</p>
                          <p className="text-dark-500 text-xs mt-0.5">
                            Reach 75%+ accuracy on a topic to see it here.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Topic Distribution Pie ── */}
              {pieData.length > 0 && (
                <div className="card">
                  <SectionHeader
                    icon={Activity} iconColor="text-primary-400"
                    title="Topic Mastery Distribution"
                    sub={`${breakdown.topic_count} topics analysed`}
                  />
                  <div className="flex items-center gap-8 flex-wrap">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={pieData} cx="50%" cy="50%"
                          innerRadius={45} outerRadius={72}
                          dataKey="value" paddingAngle={3}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="glass rounded-xl px-3 py-2 text-xs border border-dark-600">
                                <p style={{ color: payload[0].payload.color }} className="font-bold">
                                  {payload[0].name}: {payload[0].value} topic{payload[0].value !== 1 ? "s" : ""}
                                </p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-3 flex-1">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-dark-300 flex-1">{d.name} topics</span>
                          <span className="text-sm font-bold text-dark-100">{d.value}</span>
                          <span className="text-xs text-dark-500 w-12 text-right">
                            {Math.round((d.value / breakdown.topic_count) * 100)}%
                          </span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-dark-700/50 mt-1">
                        <p className="text-xs text-dark-500">
                          Overall Skill Score:{" "}
                          <span className={`font-bold ${sl.color}`}>{overall}/100 — {sl.label}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Decay Preview ── */}
              {breakdown.decay_preview && breakdown.decay_preview.at_risk && (
                <div className="card border border-orange-500/25 bg-orange-500/5">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-500/10 rounded-xl p-2.5 shrink-0">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-orange-300 text-sm">Skill Decay Risk Detected</p>
                      <p className="text-dark-400 text-xs mt-1 leading-relaxed">
                        If you don't submit a test soon, your skill score may drop by{" "}
                        <span className="text-orange-400 font-semibold">
                          {breakdown.decay_preview.projected_decay} pts
                        </span>{" "}
                        (from {breakdown.decay_preview.current_score} →{" "}
                        {breakdown.decay_preview.projected_score}).
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold font-mono text-orange-400">
                        −{breakdown.decay_preview.projected_decay}
                      </p>
                      <p className="text-xs text-dark-500">projected</p>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </main>
    </div>
  );
}