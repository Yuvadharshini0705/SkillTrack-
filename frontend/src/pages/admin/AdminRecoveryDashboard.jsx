import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import AdminSidebar from "../../components/admin/AdminSidebar";
import {
  AlertTriangle, Activity, Users, CheckCircle,
  RefreshCw, Search, ChevronLeft, ChevronRight,
  BookOpen, Clock, Zap, TrendingDown, Send, X,
  ShieldAlert, Eye
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  critical: {
    label:     "Critical",
    color:     "text-rose-400",
    bg:        "bg-rose-500/10",
    border:    "border-rose-500/30",
    badge:     "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    dot:       "bg-rose-500",
    icon:      ShieldAlert,
  },
  recovery: {
    label:     "In Recovery",
    color:     "text-orange-400",
    bg:        "bg-orange-500/10",
    border:    "border-orange-500/30",
    badge:     "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    dot:       "bg-orange-400",
    icon:      TrendingDown,
  },
  watch: {
    label:     "Needs Watch",
    color:     "text-yellow-400",
    bg:        "bg-yellow-500/10",
    border:    "border-yellow-500/30",
    badge:     "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    dot:       "bg-yellow-400",
    icon:      Activity,
  },
};

const FILTERS = [
  { key: "all",      label: "All At Risk" },
  { key: "critical", label: "Critical"    },
  { key: "recovery", label: "Recovery"    },
  { key: "watch",    label: "Watch"       },
];


// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminRecoveryDashboard() {
  const [overview,    setOverview]    = useState(null);
  const [students,    setStudents]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [pages,       setPages]       = useState(1);
  const [filter,      setFilter]      = useState("all");
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [selected,    setSelected]    = useState(null);   // student detail modal
  const [assigning,   setAssigning]   = useState(null);  // { user_id, course_id, name }
  const [assignNote,  setAssignNote]  = useState("");
  const [assignBusy,  setAssignBusy]  = useState(false);
  const [assignDone,  setAssignDone]  = useState(false);

  // ── Load overview stats ────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    try {
      const r = await api.get("/admin/recovery/overview");
      setOverview(r.data.overview);
    } catch (e) {
      console.error("Overview load failed", e);
    }
  }, []);

  // ── Load student list ──────────────────────────────────────────────────
  const loadStudents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await api.get("/admin/recovery/students", {
        params: { page: p, limit: 20, filter, search },
      });
      setStudents(r.data.students);
      setTotal(r.data.total);
      setPages(r.data.pages);
      setPage(p);
    } catch (e) {
      console.error("Students load failed", e);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadStudents(1); }, [filter]);   // reset to page 1 on filter change

  const handleSearch = (e) => {
    e.preventDefault();
    loadStudents(1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadOverview(), loadStudents(page)]);
    setRefreshing(false);
  };

  // ── Manual assign ──────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!assigning) return;
    setAssignBusy(true);
    try {
      await api.post(`/admin/recovery/assign/${assigning.user_id}`, {
        course_id: assigning.course_id,
        note:      assignNote,
      });
      setAssignDone(true);
      setTimeout(() => {
        setAssigning(null);
        setAssignNote("");
        setAssignDone(false);
        loadStudents(page);
        loadOverview();
      }, 1500);
    } catch (e) {
      console.error("Assign failed", e);
    } finally {
      setAssignBusy(false);
    }
  };

  const ov = overview;

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-6 h-6 text-orange-400" />
                Recovery Dashboard
              </h1>
              <p className="text-dark-400 text-sm mt-1">
                Students with declining skill scores — track and intervene
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 
                text-dark-300 hover:text-white hover:bg-dark-700 transition-all text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* ── Overview cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <OverviewCard
              icon={ShieldAlert} label="Critical"
              value={ov?.critical ?? "—"}
              color="text-rose-400" bg="bg-rose-500/10"
              sub={`below ${ov?.thresholds?.critical ?? 30}`}
              alert={ov?.critical > 0}
            />
            <OverviewCard
              icon={TrendingDown} label="In Recovery"
              value={ov?.in_recovery ?? "—"}
              color="text-orange-400" bg="bg-orange-500/10"
              sub={`below ${ov?.thresholds?.recovery ?? 45}`}
            />
            <OverviewCard
              icon={Activity} label="Needs Watch"
              value={ov?.needs_watch ?? "—"}
              color="text-yellow-400" bg="bg-yellow-500/10"
              sub="score 45–65"
            />
            <OverviewCard
              icon={CheckCircle} label="Healthy"
              value={ov?.healthy ?? "—"}
              color="text-emerald-400" bg="bg-emerald-500/10"
              sub="score above 65"
            />
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card flex items-center gap-4">
              <div className="bg-purple-500/10 rounded-xl p-3 shrink-0">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-white">{ov?.pending_assignments ?? "—"}</p>
                <p className="text-xs text-dark-500">Pending Recovery Tasks</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="bg-emerald-500/10 rounded-xl p-3 shrink-0">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-white">{ov?.completed_today ?? "—"}</p>
                <p className="text-xs text-dark-500">Completed Today</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="bg-blue-500/10 rounded-xl p-3 shrink-0">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-white">{ov?.recovery_tasks_available ?? "—"}</p>
                <p className="text-xs text-dark-500">Recovery Tasks in Bank</p>
              </div>
            </div>
          </div>

          {/* Recovery tasks warning if none exist */}
          {ov?.recovery_tasks_available === 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300">
                <strong>No recovery tasks in the task bank.</strong>{" "}
                Go to <a href="/admin/tasks" className="underline hover:text-rose-200">Tasks</a> and
                mark some tasks as recovery tasks so the system can assign them.
              </p>
            </div>
          )}

          {/* ── Filters + Search ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Filter tabs */}
            <div className="flex gap-1 bg-dark-900 rounded-xl p-1">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === f.key
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "text-dark-400 hover:text-dark-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search student…"
                  className="bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-4 py-2 
                    text-sm text-dark-200 placeholder-dark-600 focus:outline-none 
                    focus:border-orange-500/50 w-48"
                />
              </div>
              <button type="submit"
                className="px-3 py-2 rounded-xl bg-dark-800 text-dark-300 hover:text-white
                  hover:bg-dark-700 text-sm transition-all">
                Search
              </button>
            </form>
          </div>

          {/* ── Student Table ─────────────────────────────────────────── */}
          <div className="card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-dark-800 flex items-center justify-between">
              <h2 className="font-semibold text-dark-200">
                At-Risk Students
                <span className="ml-2 text-sm text-dark-500 font-normal">({total})</span>
              </h2>
            </div>

            {loading ? (
              <div className="py-16 text-center text-dark-500 text-sm">Loading…</div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400/40 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">No students in this category.</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-800/50">
                {students.map(s => (
                  <StudentRow
                    key={`${s.user_id}-${s.course_id}`}
                    student={s}
                    onViewDetail={() => setSelected(s.user_id)}
                    onAssign={() => {
                      setAssigning({ user_id: s.user_id, course_id: s.course_id, name: s.full_name });
                      setAssignNote("");
                      setAssignDone(false);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-5 py-4 border-t border-dark-800 flex items-center justify-between">
                <p className="text-xs text-dark-500">
                  Page {page} of {pages} — {total} students
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadStudents(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg bg-dark-800 text-dark-400 
                      hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => loadStudents(page + 1)}
                    disabled={page >= pages}
                    className="p-1.5 rounded-lg bg-dark-800 text-dark-400 
                      hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Student Detail Modal ───────────────────────────────────── */}
      {selected && (
        <StudentDetailModal
          userId={selected}
          onClose={() => setSelected(null)}
          onAssign={(uid, cid, name) => {
            setSelected(null);
            setAssigning({ user_id: uid, course_id: cid, name });
          }}
        />
      )}

      {/* ── Assign Confirmation Modal ──────────────────────────────── */}
      {assigning && (
        <Modal onClose={() => setAssigning(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 rounded-xl p-2.5">
                <Send className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Assign Recovery Tasks</h3>
                <p className="text-sm text-dark-400">{assigning.name}</p>
              </div>
            </div>

            {assignDone ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-300 text-sm font-medium">Recovery tasks assigned!</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-dark-400 font-medium mb-1.5 block">
                    Optional message to student
                  </label>
                  <textarea
                    rows={3}
                    value={assignNote}
                    onChange={e => setAssignNote(e.target.value)}
                    placeholder="e.g. Focus on Arrays and Loops topics this week."
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3
                      text-sm text-dark-200 placeholder-dark-600 resize-none
                      focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAssigning(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-dark-800 text-dark-400
                      hover:text-white text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={assignBusy}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                      text-white text-sm font-semibold transition-all disabled:opacity-60"
                  >
                    {assignBusy ? "Assigning…" : "Assign Tasks"}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ROW
// ─────────────────────────────────────────────────────────────────────────────

function StudentRow({ student, onViewDetail, onAssign }) {
  const cfg  = STATUS_CONFIG[student.status] || STATUS_CONFIG.watch;
  const Icon = cfg.icon;

  return (
    <div className="px-5 py-4 flex items-center gap-4 hover:bg-dark-900/40 transition-colors">

      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-dark-100 truncate">
          {student.full_name || "—"}
        </p>
        <p className="text-xs text-dark-500 truncate">{student.email}</p>
      </div>

      {/* Course */}
      <div className="hidden sm:block min-w-0 w-32">
        <p className="text-xs text-dark-400 truncate">{student.course_name}</p>
        <p className="text-xs text-dark-600">Day {student.current_day}</p>
      </div>

      {/* Skill score bar */}
      <div className="w-28 hidden md:block">
        <div className="flex justify-between text-xs mb-1">
          <span className={`font-bold ${cfg.color}`}>{student.skill_score}</span>
          <span className="text-dark-600">/ 100</span>
        </div>
        <div className="w-full bg-dark-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              student.status === "critical" ? "bg-rose-500"
              : student.status === "recovery" ? "bg-orange-400"
              : "bg-yellow-400"
            }`}
            style={{ width: `${Math.max(student.skill_score, 2)}%` }}
          />
        </div>
      </div>

      {/* Status badge */}
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${cfg.badge}`}>
        {cfg.label}
      </span>

      {/* Inactive days */}
      <div className="hidden lg:flex items-center gap-1 text-xs text-dark-500 w-20 shrink-0">
        <Clock className="w-3 h-3" />
        {student.days_inactive}d idle
      </div>

      {/* Pending recovery tasks */}
      {student.pending_recovery_tasks > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300
          border border-purple-500/30 shrink-0">
          {student.pending_recovery_tasks} pending
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onViewDetail}
          className="p-1.5 rounded-lg bg-dark-800 text-dark-400 hover:text-white
            hover:bg-dark-700 transition-all"
          title="View detail"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onAssign}
          className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20
            transition-all"
          title="Assign recovery tasks"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// STUDENT DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function StudentDetailModal({ userId, onClose, onAssign }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("overview");  // overview | sessions | assignments | decay

  useEffect(() => {
    api.get(`/admin/recovery/students/${userId}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const student  = data?.student;
  const courses  = data?.courses || [];
  const course   = courses[0];  // show first course (extend to tabs if multiple)

  const cfg = course ? STATUS_CONFIG[course.status] || STATUS_CONFIG.watch : null;

  const TABS = [
    { key: "overview",     label: "Overview"    },
    { key: "sessions",     label: "Sessions"    },
    { key: "assignments",  label: "Recovery"    },
    { key: "decay",        label: "Decay Logs"  },
  ];

  return (
    <Modal onClose={onClose} wide>
      {loading ? (
        <div className="py-16 text-center text-dark-500 text-sm">Loading…</div>
      ) : !data ? (
        <div className="py-16 text-center text-rose-400 text-sm">Failed to load student data.</div>
      ) : (
        <div className="space-y-5">

          {/* Student header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/30 
                to-rose-500/30 flex items-center justify-center text-xl font-bold text-white">
                {student?.profile?.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {student?.profile?.full_name || "Unknown"}
                </h3>
                <p className="text-sm text-dark-400">{student?.email}</p>
              </div>
            </div>
            {course && cfg && (
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${cfg.badge}`}>
                {cfg.label}
              </span>
            )}
          </div>

          {/* Course score bar */}
          {course && (
            <div className={`${cfg?.bg} ${cfg?.border} border rounded-2xl p-4`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm font-semibold text-dark-200">{course.course_name}</p>
                  <p className="text-xs text-dark-500">Day {course.current_day}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-display font-bold ${cfg?.color}`}>
                    {course.skill_score}
                  </p>
                  <p className="text-xs text-dark-500">Skill Score</p>
                </div>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    course.status === "critical" ? "bg-rose-500"
                    : course.status === "recovery" ? "bg-orange-400"
                    : "bg-yellow-400"
                  }`}
                  style={{ width: `${Math.max(course.skill_score, 2)}%` }}
                />
              </div>
            </div>
          )}

          {/* Weak topics */}
          {course?.weak_topics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-dark-400 mb-2">Weak Topics</p>
              <div className="flex flex-wrap gap-2">
                {course.weak_topics.map(t => (
                  <span key={t.topic}
                    className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 
                      text-rose-300 border border-rose-500/20">
                    {t.topic} — {t.accuracy}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-dark-900 rounded-xl p-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t.key
                    ? "bg-dark-700 text-white"
                    : "text-dark-500 hover:text-dark-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">

            {tab === "overview" && course && (
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="Pending Recovery"  value={course.assignments?.filter(a => a.status === "pending").length  ?? 0} />
                <MiniStat label="Recovery Done"     value={course.assignments?.filter(a => a.status === "completed").length ?? 0} />
                <MiniStat label="Sessions Logged"   value={course.sessions?.length ?? 0} />
                <MiniStat label="Last 5 Avg Score"
                  value={
                    course.sessions?.length
                      ? Math.round(course.sessions.slice(0,5).reduce((s,x) => s + (x.percent||0), 0) / Math.min(5, course.sessions.length)) + "%"
                      : "—"
                  }
                />
                <MiniStat label="Weak Topic Count"  value={course.weak_topics?.length ?? 0} />
                <MiniStat label="Decay Logs"        value={course.decay_logs?.length ?? 0} />
              </div>
            )}

            {tab === "sessions" && (
              course?.sessions?.length ? course.sessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-dark-900 
                  rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-dark-200">
                      Day {s.day} test
                    </p>
                    <p className="text-xs text-dark-500">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${
                    (s.percent || 0) >= 60 ? "text-emerald-400"
                    : (s.percent || 0) >= 40 ? "text-yellow-400"
                    : "text-rose-400"
                  }`}>
                    {s.percent ?? "—"}%
                  </span>
                </div>
              )) : <Empty msg="No test sessions yet." />
            )}

            {tab === "assignments" && (
              course?.assignments?.length ? course.assignments.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-dark-900
                  rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-dark-400">{a.assigned_date}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-orange-500/20 text-orange-300"
                  }`}>
                    {a.status}
                  </span>
                </div>
              )) : <Empty msg="No recovery assignments yet." />
            )}

            {tab === "decay" && (
              course?.decay_logs?.length ? course.decay_logs.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-dark-900
                  rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-dark-200 capitalize">
                      {d.decay_type?.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-dark-500">
                      {d.logged_at ? new Date(d.logged_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-rose-400 font-bold">−{d.decay_amount}</p>
                    <p className="text-xs text-dark-500">{d.previous_score} → {d.new_score}</p>
                  </div>
                </div>
              )) : <Empty msg="No decay events logged." />
            )}
          </div>

          {/* Action button */}
          {course && (
            <button
              onClick={() => onAssign(userId, course.course_id, student?.profile?.full_name)}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 
                text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Assign Recovery Tasks
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLES
// ─────────────────────────────────────────────────────────────────────────────

function OverviewCard({ icon: Icon, label, value, color, bg, sub, alert }) {
  return (
    <div className={`card flex items-center gap-4 ${alert ? "border border-rose-500/20" : ""}`}>
      <div className={`${bg} rounded-xl p-3 shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <div className="font-display text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-dark-500">{label}</div>
        {sub && <div className="text-xs text-dark-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-dark-900 rounded-xl p-3">
      <p className="text-lg font-display font-bold text-white">{value}</p>
      <p className="text-xs text-dark-500 mt-0.5">{label}</p>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="py-8 text-center text-dark-500 text-sm">{msg}</div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl
        w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto p-6 relative`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-dark-500 
            hover:text-white hover:bg-dark-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}