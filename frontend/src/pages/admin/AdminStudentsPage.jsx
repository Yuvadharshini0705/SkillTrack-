import { useState, useEffect } from "react";
import api from "../../utils/api";
import AdminSidebar from "../../components/admin/AdminSidebar";
import toast from "react-hot-toast";
import { Search, UserCheck, UserX, Loader2, Trash2, ChevronLeft, ChevronRight, Eye, BookX, AlertTriangle, X, Filter, Users } from "lucide-react";

function DeleteModal({ student, onConfirm, onCancel, loading }) {
  const [typed, setTyped] = useState("");
  const email = student?.email || "";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass rounded-2xl border border-rose-500/30 w-full max-w-md animate-slide-up shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Permanently Delete Student</h3>
              <p className="text-xs text-rose-400">This action cannot be undone</p>
            </div>
          </div>
          <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-dark-300 mb-2">This will permanently delete all data:</p>
            <ul className="text-xs text-dark-400 space-y-1">
              {["Student account & profile", "All performance records", "All test sessions & scores", "All notifications & decay logs"].map(item => (
                <li key={item} className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full shrink-0" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1.5">Type <span className="font-mono text-rose-300 text-xs">{email}</span> to confirm</label>
            <input className="input-field text-sm" placeholder="Type the email address..." value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
            <button onClick={onConfirm} disabled={typed !== email || loading}
              className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoveCourseModal({ student, onConfirm, onCancel, loading }) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const courses = student?.profile?.courses || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass rounded-2xl border border-orange-500/30 w-full max-w-md animate-slide-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center"><BookX className="w-5 h-5 text-orange-400" /></div>
              <div><h3 className="font-display text-lg font-bold text-white">Remove from Course</h3><p className="text-xs text-orange-400">Permanently removes enrollment & all data</p></div>
            </div>
            <button onClick={onCancel}><X className="w-5 h-5 text-dark-500" /></button>
          </div>
          {courses.length === 0 ? <p className="text-dark-400 text-sm text-center py-4">No courses enrolled.</p> : (
            <>
              <div className="space-y-2 mb-4">
                {courses.map((c) => (
                  <button key={c.course_id} onClick={() => setSelectedCourse(c.course_id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedCourse === c.course_id ? "border-orange-500/50 bg-orange-500/10" : "border-dark-700 bg-dark-800/50 hover:border-dark-600"}`}>
                    <p className="text-sm font-semibold text-dark-100">{c.course_name}</p>
                    <p className="text-xs text-dark-500 mt-0.5">Day {c.current_day} · Skill: {Math.round(c.skill_score || 75)}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={onCancel} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
                <button onClick={() => onConfirm(selectedCourse)} disabled={!selectedCourse || loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookX className="w-4 h-4" />} Remove from Course
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentDetailDrawer({ student, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!student) return;
    api.get(`/admin/students/${student._id || student.id}/detail`).then(r => setDetail(r.data)).catch(() => toast.error("Failed to load detail")).finally(() => setLoading(false));
  }, [student]);
  if (!student) return null;
  const getSkillColor = (s) => s >= 85 ? "text-emerald-400" : s >= 70 ? "text-blue-400" : s >= 55 ? "text-yellow-400" : s >= 40 ? "text-orange-400" : "text-rose-400";
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-dark-900 border-l border-dark-700 overflow-y-auto flex flex-col">
        <div className="p-5 border-b border-dark-800 flex items-center justify-between">
          <div><h2 className="font-display text-lg font-bold text-white">{student.profile?.full_name || "Student"}</h2><p className="text-sm text-dark-400">{student.email}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-dark-800 rounded-lg transition-colors"><X className="w-5 h-5 text-dark-400" /></button>
        </div>
        {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div> : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[{label:"Total XP",value:student.profile?.total_xp||0},{label:"Level",value:`Lv.${student.profile?.level||1}`},{label:"Streak",value:`${student.profile?.current_streak||0}d`}].map(s => (
                <div key={s.label} className="glass rounded-xl p-3 text-center">
                  <div className="font-display text-xl font-bold text-primary-400">{s.value}</div>
                  <div className="text-xs text-dark-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {detail?.course_summaries?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-300 mb-2">Enrolled Courses</h3>
                <div className="space-y-2">
                  {detail.course_summaries.map(c => (
                    <div key={c.course_id} className="glass rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-dark-100">{c.course_name}</p>
                        <span className="text-xs text-dark-500">Day {c.current_day}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400" style={{width:`${Math.min(c.skill_score,100)}%`}} />
                        </div>
                        <span className={`text-xs font-bold ${getSkillColor(c.skill_score)}`}>{Math.round(c.skill_score)}</span>
                      </div>
                      <p className="text-xs text-dark-500 mt-1">{c.sessions_done} sessions completed</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detail?.decay_logs?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-dark-300 mb-2">Recent Decay Events</h3>
                <div className="space-y-2">
                  {detail.decay_logs.slice(0,5).map((d,i) => (
                    <div key={i} className="flex items-center justify-between glass rounded-xl p-3">
                      <div><p className="text-xs font-semibold text-rose-400">{d.decay_type}</p><p className="text-xs text-dark-500">{d.logged_at?.slice(0,10)}</p></div>
                      <span className="text-sm font-bold text-rose-400">-{d.decay_amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [courseTarget, setCourseTarget] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);

  const load = (q = search, p = page, sf = statusFilter) => {
    setLoading(true);
    api.get(`/admin/students?search=${q}&page=${p}&per_page=15&status=${sf}`)
      .then(r => { setStudents(r.data.students); setTotal(r.data.total); setPages(r.data.pages); })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id, name) => {
    try {
      const r = await api.post(`/admin/students/${id}/toggle`);
      toast.success(`${name} ${r.data.is_active ? "activated" : "deactivated"}`);
      load();
    } catch { toast.error("Action failed"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const r = await api.delete(`/admin/students/${deleteTarget._id || deleteTarget.id}?confirm=true`);
      toast.success(r.data.message);
      setDeleteTarget(null);
      load();
    } catch (e) { toast.error(e.response?.data?.error || "Delete failed"); }
    finally { setDeleteLoading(false); }
  };

  const handleRemoveCourse = async (courseId) => {
    if (!courseTarget || !courseId) return;
    setCourseLoading(true);
    try {
      await api.post(`/admin/students/${courseTarget._id || courseTarget.id}/remove-course`, { course_id: courseId });
      toast.success("Student removed from course permanently");
      setCourseTarget(null); load();
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setCourseLoading(false); }
  };

  const getSkillColor = (s) => s >= 85 ? "text-emerald-400" : s >= 70 ? "text-blue-400" : s >= 55 ? "text-yellow-400" : s >= 40 ? "text-orange-400" : "text-rose-400";

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div><h1 className="font-display text-2xl font-bold text-white">Students</h1><p className="text-dark-400 text-sm mt-0.5">{total} registered students</p></div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input className="input-field pl-10 text-sm" placeholder="Search by name or email..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); load(e.target.value, 1, statusFilter); }} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-dark-500" />
              {["","active","inactive"].map(sf => (
                <button key={sf} onClick={() => { setStatusFilter(sf); setPage(1); load(search, 1, sf); }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${statusFilter===sf ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" : "glass-hover text-dark-400"}`}>
                  {sf === "" ? "All" : sf === "active" ? "Active" : "Inactive"}
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
            ) : students.length === 0 ? (
              <div className="text-center py-16 text-dark-500"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No students found</p></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    {["Student","Email","Courses","Avg Skill","XP / Level","Status","Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-dark-500 px-4 py-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/50">
                  {students.map((s) => {
                    const profile = s.profile || {};
                    const isActive = s.is_active !== false;
                    const avgSkill = profile.courses?.length > 0
                      ? Math.round(profile.courses.reduce((a,c)=>a+(c.skill_score||75),0)/profile.courses.length) : 75;
                    return (
                      <tr key={s._id||s.id} className="hover:bg-dark-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/30 to-neon-purple/30 flex items-center justify-center text-sm font-bold text-white shrink-0">
                              {profile.full_name?.[0]?.toUpperCase()||"?"}
                            </div>
                            <span className="text-sm font-medium text-dark-100">{profile.full_name||"—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-dark-400">{s.email}</td>
                        <td className="px-4 py-3 text-sm text-dark-400">{profile.courses?.length||0}</td>
                        <td className="px-4 py-3"><span className={`text-sm font-bold ${getSkillColor(avgSkill)}`}>{avgSkill}</span></td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-primary-400 font-semibold">{profile.total_xp||0}</span>
                          <span className="text-xs text-dark-500 ml-1">Lv.{profile.level||1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge text-xs ${isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-dark-700 text-dark-500"}`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setDetailStudent(s)} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors" title="View details"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleToggle(s._id||s.id, profile.full_name||s.email)}
                              className={`p-1.5 rounded-lg transition-colors ${isActive ? "hover:bg-orange-500/10 text-dark-500 hover:text-orange-400" : "hover:bg-emerald-500/10 text-dark-500 hover:text-emerald-400"}`}
                              title={isActive ? "Deactivate" : "Activate"}>
                              {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setCourseTarget(s)} className="p-1.5 rounded-lg hover:bg-orange-500/10 text-dark-500 hover:text-orange-400 transition-colors" title="Remove from course"><BookX className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-dark-500 hover:text-rose-400 transition-colors" title="Delete permanently"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-dark-500">Page {page} of {pages} — {total} students</p>
              <div className="flex gap-2">
                <button onClick={() => { setPage(p=>p-1); load(search,page-1,statusFilter); }} disabled={page===1} className="p-2 rounded-lg glass-hover disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(p=>(
                  <button key={p} onClick={() => { setPage(p); load(search,p,statusFilter); }}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${p===page ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" : "glass-hover text-dark-400"}`}>{p}</button>
                ))}
                <button onClick={() => { setPage(p=>p+1); load(search,page+1,statusFilter); }} disabled={page===pages} className="p-2 rounded-lg glass-hover disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {deleteTarget && <DeleteModal student={deleteTarget} loading={deleteLoading} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
      {courseTarget && <RemoveCourseModal student={courseTarget} loading={courseLoading} onConfirm={handleRemoveCourse} onCancel={() => setCourseTarget(null)} />}
      {detailStudent && <StudentDetailDrawer student={detailStudent} onClose={() => setDetailStudent(null)} />}
    </div>
  );
}