import { useState, useEffect, useRef } from "react";
import api from "../../utils/api";
import AdminSidebar from "../../components/admin/AdminSidebar";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Users, BookOpen, BarChart2, Zap, Award,
  AlertTriangle, Loader2, RefreshCw, UserCheck, Target,
  ChevronDown, Search, CheckCircle,
} from "lucide-react";

function skillLabel(score) {
  if (score >= 85) return { label: "Expert",     color: "text-emerald-400" };
  if (score >= 70) return { label: "Proficient", color: "text-blue-400"    };
  if (score >= 55) return { label: "Developing", color: "text-yellow-400"  };
  return               { label: "Struggling",    color: "text-rose-400"    };
}
function statusBadge(status) {
  if (status === "top")        return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
  if (status === "needs-help") return "bg-rose-500/10 border border-rose-500/20 text-rose-400";
  return "bg-blue-500/10 border border-blue-500/20 text-blue-400";
}
function statusLabel(status) {
  if (status === "top")        return "Top";
  if (status === "needs-help") return "At Risk";
  return "Active";
}
function fmtDate(str) {
  try { return new Date(str).toLocaleDateString("en", { month: "short", day: "numeric" }); }
  catch { return str; }
}

function ChartTip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-sm border border-dark-600 shadow-lg">
      {label && <p className="text-dark-400 text-xs mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#6366f1" }} className="font-bold">{p.value}{suffix}</p>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, sub }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`${bg} rounded-xl p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-xl font-bold text-white leading-tight">{value ?? "—"}</div>
        <div className="text-xs text-dark-500 truncate">{label}</div>
        {sub && <div className="text-xs text-dark-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function SecHead({ icon: Icon, color, title, sub }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${color}`} />
      <h3 className="font-semibold text-dark-200">{title}</h3>
      {sub && <span className="text-xs text-dark-600 ml-auto">{sub}</span>}
    </div>
  );
}

function Empty({ message }) {
  return (
    <div className="h-44 flex flex-col items-center justify-center gap-2 text-center">
      <BarChart2 className="w-6 h-6 text-dark-600" />
      <p className="text-dark-500 text-sm">{message}</p>
    </div>
  );
}

function StudentRow({ s }) {
  const sl = skillLabel(s.skill_score);
  const initials = s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const barColor = s.progress >= 70 ? "bg-emerald-500" : s.progress >= 40 ? "bg-blue-500" : "bg-dark-500";
  return (
    <tr className="border-b border-dark-700/40 hover:bg-dark-800/40 transition-colors">
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400 shrink-0">{initials}</div>
          <span className="text-sm text-dark-200 truncate max-w-[130px]">{s.name}</span>
        </div>
      </td>
      <td className="py-2.5 px-3 text-right">
        <span className="text-sm text-yellow-400 font-semibold flex items-center gap-1 justify-end">
          <Zap className="w-3 h-3" />{s.xp.toLocaleString()}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-[50px] h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, s.progress)}%` }} />
          </div>
          <span className="text-xs text-dark-400 w-8 text-right shrink-0">{s.progress}%</span>
        </div>
      </td>
      <td className="py-2.5 px-3 text-center">
        <span className={`text-xs font-bold ${sl.color}`}>{s.skill_score}</span>
      </td>
      <td className="py-2.5 px-3 text-center text-xs text-dark-400">{s.submissions}</td>
      <td className="py-2.5 px-3 text-right">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(s.status)}`}>{statusLabel(s.status)}</span>
      </td>
      <td className="py-2.5 px-3 text-right text-xs text-dark-500">{s.last_active}</td>
    </tr>
  );
}

export default function AdminAnalyticsPage() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [refreshing,    setRefreshing]    = useState(false);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [dropOpen,      setDropOpen]      = useState(false);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");

  function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    api.get("/admin/analytics")
      .then((r) => {
        const d = r.data;
        setData(d);
        const ids = Object.keys(d?.course_students || {});
        if (ids.length > 0) setActiveCourseId((prev) => prev || ids[0]);
      })
      .catch((err) => {
        console.error("[AdminAnalytics] fetch error:", err);
        setError(err?.response?.data?.error || err?.message || "Failed to load analytics");
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  const courseStudents   = data?.course_students || {};
  const courseIds        = Object.keys(courseStudents);
  const activeCourse     = activeCourseId ? courseStudents[activeCourseId] : null;
  const allStudents      = activeCourse?.students || [];
  const topCount         = allStudents.filter((s) => s.status === "top").length;
  const atRiskCount      = allStudents.filter((s) => s.status === "needs-help").length;
  const activeCount      = allStudents.filter((s) => s.status === "active").length;
  const filteredStudents = allStudents.filter((s) => {
    const ok1 = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const ok2  = statusFilter === "all" || s.status === statusFilter;
    return ok1 && ok2;
  });

  const subTrend    = (data?.submission_trend    || []).map((d) => ({ ...d, date: fmtDate(d.date) }));
  const dauTrend    = (data?.active_users_trend  || []).map((d) => ({ ...d, date: fmtDate(d.date) }));
  const taskTypes   = Object.entries(data?.task_type_breakdown || {})
    .filter(([, v]) => v > 0).map(([t, c]) => ({ type: t.toUpperCase(), count: c })).sort((a, b) => b.count - a.count);
  const SKILL_C     = { "Expert (85+)": "#10b981", "Proficient (70-84)": "#0ea5e9", "Developing (55-69)": "#f59e0b", "Struggling (<55)": "#ef4444" };
  const skillPie    = Object.entries(data?.skill_distribution || {}).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, color: SKILL_C[name] || "#888" }));
  const pieTotal    = skillPie.reduce((s, d) => s + d.value, 0);
  const topStudents = (data?.top_students || []).map((s) => ({ ...s, shortName: s.name.split(" ")[0] }));
  const totalSubs7d = subTrend.reduce((a, b) => a + (b.submissions || 0), 0);
  const latestDAU   = dauTrend.length > 0 ? dauTrend[dauTrend.length - 1].users : 0;
  const TYPE_COLORS = ["#6366f1", "#f59e0b", "#8b5cf6", "#0ea5e9"];
  const TYPE_TEXT   = ["text-indigo-400", "text-amber-400", "text-purple-400", "text-cyan-400"];

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Admin Analytics</h1>
              <p className="text-dark-400 text-sm mt-1">Platform-wide insights, student performance &amp; course health</p>
            </div>
            <button onClick={() => fetchData(true)} disabled={refreshing || loading}
              className="flex items-center gap-1.5 glass px-3 py-2 rounded-xl text-dark-400 hover:text-dark-100 text-sm transition-all disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <p className="text-dark-400 text-sm">Loading analytics…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="card border border-rose-500/30 bg-rose-500/5 text-center py-12 space-y-4">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-rose-300 font-semibold">Failed to load analytics</p>
              <p className="text-dark-400 text-sm font-mono">{error}</p>
              <button onClick={() => fetchData()}
                className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm hover:bg-rose-500/20 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {/* Main content */}
          {!loading && !error && data && (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users}         label="Total Enrollments"  value={pieTotal}     color="text-primary-400" bg="bg-primary-500/10" />
                <StatCard icon={UserCheck}     label="Active Today"       value={latestDAU}    color="text-emerald-400" bg="bg-emerald-500/10" sub="From DAU trend" />
                <StatCard icon={CheckCircle}   label="Submissions (7d)"   value={totalSubs7d}  color="text-blue-400"    bg="bg-blue-500/10" />
                <StatCard icon={AlertTriangle} label="At-Risk Students"   value={atRiskCount}  color="text-orange-400"  bg="bg-orange-500/10" sub={atRiskCount === 0 ? "All students active" : "Inactive 3+ days"} />
              </div>

              {/* Trend Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card">
                  <SecHead icon={TrendingUp} color="text-primary-400" title="Submission Trend (7 days)" sub={`${subTrend.length} days`} />
                  {subTrend.length >= 2 ? (
                    <ResponsiveContainer width="100%" height={190}>
                      <LineChart data={subTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                        <Tooltip content={<ChartTip suffix=" subs" />} />
                        <Line type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={2.5}
                          dot={{ fill: "#6366f1", r: 3 }} activeDot={{ r: 5, fill: "#818cf8" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <Empty message="Not enough data yet" />}
                </div>

                <div className="card">
                  <SecHead icon={UserCheck} color="text-emerald-400" title="Daily Active Users (14 days)" sub={`${dauTrend.length} days`} />
                  {dauTrend.length >= 2 ? (
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={dauTrend} barSize={16} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                        <Tooltip content={<ChartTip suffix=" users" />} />
                        <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                          {dauTrend.map((_, i) => (
                            <Cell key={i} fill={i === dauTrend.length - 1 ? "#10b981" : "#10b98155"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <Empty message="Not enough data yet" />}
                </div>
              </div>

              {/* Top Students + Skill Pie */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 card">
                  <SecHead icon={Award} color="text-yellow-400" title="Top Students by XP" sub="Top 8 active" />
                  {topStudents.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={topStudents} layout="vertical" barSize={20} margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
                        <YAxis type="category" dataKey="shortName" tick={{ fill: "#94a3b8", fontSize: 11 }} width={65} />
                        <Tooltip content={<ChartTip suffix=" XP" />} />
                        <Bar dataKey="xp" radius={[0, 6, 6, 0]}>
                          {topStudents.map((_, i) => (
                            <Cell key={i} fill={["#f59e0b","#94a3b8","#cd7f32","#6366f1","#6366f1","#6366f1","#6366f1","#6366f1"][i] || "#6366f1"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <Empty message="No students yet" />}
                </div>

                <div className="card flex flex-col">
                  <SecHead icon={Target} color="text-blue-400" title="Skill Distribution" />
                  {skillPie.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={130}>
                        <PieChart>
                          <Pie data={skillPie} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" paddingAngle={3}>
                            {skillPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="glass rounded-xl px-3 py-2 text-xs border border-dark-600">
                                <p style={{ color: payload[0].payload.color }} className="font-bold">
                                  {payload[0].name}: {payload[0].value}
                                </p>
                              </div>
                            );
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {skillPie.map((d) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-xs text-dark-400 flex-1 truncate">{d.name}</span>
                            <span className="text-xs font-semibold text-dark-200">{d.value}</span>
                            <span className="text-xs text-dark-600 w-8 text-right">{pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <Empty message="No skill data" />}
                </div>
              </div>

              {/* Task Type Breakdown */}
              {taskTypes.length > 0 && (
                <div className="card">
                  <SecHead icon={BarChart2} color="text-cyan-400" title="Approved Tasks by Type"
                    sub={`${taskTypes.reduce((a, b) => a + b.count, 0)} total`} />
                  <div className="flex items-end gap-8 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <ResponsiveContainer width="100%" height={130}>
                        <BarChart data={taskTypes} barSize={38} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="type" tick={{ fill: "#64748b", fontSize: 11 }} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                          <Tooltip content={<ChartTip suffix=" tasks" />} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {taskTypes.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % 4]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-5 pb-2">
                      {taskTypes.map((t, i) => (
                        <div key={i} className="text-center">
                          <p className={`text-2xl font-bold font-mono ${TYPE_TEXT[i % 4]}`}>{t.count}</p>
                          <p className="text-xs text-dark-500 mt-0.5">{t.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Per-Course Student Table */}
              {courseIds.length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <BookOpen className="w-4 h-4 text-violet-400 shrink-0" />
                    <h3 className="font-semibold text-dark-200">Students by Course</h3>
                    <div className="relative ml-auto">
                      <button onClick={() => setDropOpen((o) => !o)}
                        className="glass px-3 py-1.5 rounded-xl text-sm text-dark-300 hover:text-dark-100 flex items-center gap-2 transition-all">
                        {activeCourse?.course_name || "Select course"}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {dropOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-xl z-20 min-w-[180px] py-1">
                          {courseIds.map((cid) => (
                            <button key={cid}
                              onClick={() => { setActiveCourseId(cid); setDropOpen(false); setSearch(""); setStatusFilter("all"); }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                activeCourseId === cid ? "bg-primary-500/20 text-primary-400" : "text-dark-300 hover:bg-dark-700 hover:text-dark-100"
                              }`}>
                              {courseStudents[cid]?.course_name || cid}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {activeCourse && (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "Top Performers",  value: topCount,    color: "text-emerald-400", ring: "border-emerald-500/30", filter: "top"        },
                          { label: "Active",          value: activeCount, color: "text-blue-400",    ring: "border-blue-500/30",    filter: "active"     },
                          { label: "Needs Attention", value: atRiskCount, color: "text-rose-400",    ring: "border-rose-500/30",    filter: "needs-help" },
                        ].map((s) => (
                          <button key={s.filter}
                            onClick={() => setStatusFilter(statusFilter === s.filter ? "all" : s.filter)}
                            className={`rounded-xl p-3 text-center transition-all border ${statusFilter === s.filter ? `bg-dark-700 ${s.ring}` : "bg-dark-800/50 border-dark-700/40 hover:border-dark-600"}`}>
                            <span className={`text-2xl font-bold block ${s.color}`}>{s.value}</span>
                            <span className="text-xs text-dark-500">{s.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
                        <input type="text" placeholder="Search students…" value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-9 pr-4 py-2 text-sm text-dark-200 placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50 transition-colors" />
                      </div>

                      {filteredStudents.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-dark-700/40">
                          <table className="w-full min-w-[640px]">
                            <thead>
                              <tr className="border-b border-dark-700/60">
                                {["Student","XP","Progress","Skill","Subs","Status","Last Active"].map((h, i) => (
                                  <th key={h} className={`py-2 px-3 text-xs text-dark-500 font-medium ${i === 0 ? "text-left" : i >= 5 ? "text-right" : "text-center"}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStudents.slice(0, 50).map((s) => <StudentRow key={s.id} s={s} />)}
                            </tbody>
                          </table>
                          {filteredStudents.length > 50 && (
                            <div className="text-center py-3 text-xs text-dark-500 border-t border-dark-700/40">
                              Showing 50 of {filteredStudents.length} students
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-dark-400 text-sm">
                            {search || statusFilter !== "all" ? "No students match your filters." : "No students enrolled yet."}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}