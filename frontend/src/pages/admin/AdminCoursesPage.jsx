import { useState, useEffect } from "react";
import api from "../../utils/api";
import AdminSidebar from "../../components/admin/AdminSidebar";
import toast from "react-hot-toast";
import {
  Plus, X, Check, Pencil, Trash2, AlertTriangle,
  ToggleLeft, ToggleRight, Flame,
} from "lucide-react";

const ICONS  = ["⚛️","🐍","📊","☕","☁️","📱","🎨","🔧","🌐","🛡️","📦","🤖","🚀","💡","🎯"];
const COLORS = ["#61dafb","#3776ab","#ff6f00","#f89820","#232f3e","#a855f7","#10b981","#ef4444","#f59e0b","#06b6d4","#8b5cf6","#ec4899"];

const EMPTY_FORM = { name: "", slug: "", description: "", icon: "💻", color: "#6366f1", duration_days: 180 };

export default function AdminCoursesPage() {
  const [courses,               setCourses]               = useState([]);
  const [showModal,             setShowModal]             = useState(false);
  const [editTarget,            setEditTarget]            = useState(null);
  const [form,                  setForm]                  = useState(EMPTY_FORM);
  const [loading,               setLoading]               = useState(false);

  // delete flow: null → course id (choice modal) → "permanent" (final confirm)
  const [deleteTarget,          setDeleteTarget]          = useState(null); // { id, name }
  const [showPermanentConfirm,  setShowPermanentConfirm]  = useState(false);

  const load = () => api.get("/admin/courses").then((r) => setCourses(r.data));
  useEffect(() => { load(); }, []);

  // ── open helpers ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setForm({
      name:          c.name,
      slug:          c.slug,
      description:   c.description || "",
      icon:          c.icon  || "💻",
      color:         c.color || "#6366f1",
      duration_days: c.duration_days || 180,
    });
    setShowModal(true);
  };

  // ── save (create or update) ────────────────────────────────────────────────
  const save = async () => {
    if (!form.name || !form.slug) { toast.error("Name and slug required"); return; }
    setLoading(true);
    try {
      if (editTarget) {
        const id = editTarget._id || editTarget.id;
        await api.put(`/admin/courses/${id}`, form);
        toast.success("Course updated!");
      } else {
        await api.post("/admin/courses", form);
        toast.success("Course created!");
      }
      setShowModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  // ── toggle active ──────────────────────────────────────────────────────────
  const toggleActive = async (c) => {
    const id = c._id || c.id;
    try {
      await api.put(`/admin/courses/${id}`, { is_active: !c.is_active });
      toast.success(`Course ${!c.is_active ? "activated" : "deactivated"}`);
      load();
    } catch { toast.error("Failed"); }
  };

  // ── soft deactivate ────────────────────────────────────────────────────────
  const confirmDeactivate = async () => {
    try {
      await api.delete(`/admin/courses/${deleteTarget.id}`);
      toast.success("Course deactivated");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    }
  };

  // ── permanent delete ───────────────────────────────────────────────────────
  const confirmPermanentDelete = async () => {
    try {
      const res = await api.delete(`/admin/courses/${deleteTarget.id}?permanent=true`);
      const tasksDeleted = res.data?.tasks_deleted ?? 0;
      toast.success(`Course permanently deleted · ${tasksDeleted} task(s) removed`);
      setShowPermanentConfirm(false);
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    }
  };

  // close all delete modals
  const closeDeleteModals = () => {
    setDeleteTarget(null);
    setShowPermanentConfirm(false);
  };

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Courses</h1>
              <p className="text-dark-400 text-sm">
                {courses.length} courses · {courses.filter(c => c.is_active).length} active
              </p>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Course
            </button>
          </div>

          {/* Course Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div
                key={c._id || c.id}
                className={`card hover:border-dark-600 transition-all ${!c.is_active ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{c.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark-100 text-sm leading-tight">{c.name}</h3>
                    <code className="text-xs text-dark-500 font-mono">{c.slug}</code>
                  </div>
                  <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: c.color }} />
                </div>

                <p className="text-xs text-dark-400 leading-relaxed mb-3">{c.description}</p>

                <div className="pt-3 border-t border-dark-700/50 flex items-center justify-between">
                  <span className="text-xs text-dark-500">{c.duration_days}d curriculum</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${c.is_active
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/25"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => toggleActive(c)}
                      className="p-1.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 transition-colors"
                      title={c.is_active ? "Deactivate" : "Activate"}
                    >
                      {c.is_active
                        ? <ToggleRight className="w-3.5 h-3.5" />
                        : <ToggleLeft  className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete (opens choice modal) */}
                    <button
                      onClick={() => setDeleteTarget({ id: c._id || c.id, name: c.name })}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors"
                      title="Remove course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display text-xl font-bold text-white">
                  {editTarget ? "Edit Course" : "Create Course"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-dark-500 hover:text-dark-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-dark-400 mb-1">Course Name *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Full Stack Development"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-400 mb-1">
                    Slug * (URL-friendly{editTarget ? ", read-only" : ""})
                  </label>
                  <input
                    className="input-field font-mono"
                    placeholder="e.g. mern-stack"
                    value={form.slug}
                    readOnly={!!editTarget}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-400 mb-1">Description</label>
                  <textarea
                    className="input-field resize-none"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Icon</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ICONS.map((ic) => (
                        <button
                          key={ic}
                          onClick={() => setForm({ ...form, icon: ic })}
                          className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                            form.icon === ic
                              ? "bg-primary-500/20 border border-primary-500/40"
                              : "bg-dark-700 hover:bg-dark-600"
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLORS.map((col) => (
                        <button
                          key={col}
                          onClick={() => setForm({ ...form, color: col })}
                          className={`w-7 h-7 rounded-full transition-all ${
                            form.color === col ? "ring-2 ring-white scale-110" : ""
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-dark-400 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.duration_days}
                    onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) || 180 })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Check className="w-4 h-4" />}
                  {editTarget ? "Save Changes" : "Create Course"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Choice Modal ─────────────────────────────────────────────── */}
        {deleteTarget && !showPermanentConfirm && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-dark-900 border border-rose-500/30 rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
              <h3 className="font-display text-lg font-bold text-white">Remove Course?</h3>
              <p className="text-dark-400 text-sm">
                How do you want to remove{" "}
                <span className="text-white font-medium">"{deleteTarget.name}"</span>?
              </p>

              {/* Deactivate info */}
              <div className="bg-dark-800 rounded-xl p-3 text-left space-y-1">
                <p className="text-yellow-400 text-xs font-semibold flex items-center gap-1.5">
                  <ToggleLeft className="w-3.5 h-3.5" /> Deactivate
                </p>
                <p className="text-dark-400 text-xs">
                  Hides the course from students. All data is preserved and can be reactivated later.
                </p>
              </div>

              {/* Permanent delete info */}
              <div className="bg-dark-800 rounded-xl p-3 text-left space-y-1">
                <p className="text-rose-400 text-xs font-semibold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Delete Permanently
                </p>
                <p className="text-dark-400 text-xs">
                  Removes the course and <span className="text-rose-300 font-medium">all its tasks</span> forever.
                  This cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex gap-2">
                  <button onClick={closeDeleteModals} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeactivate}
                    className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/25 transition-colors"
                  >
                    Deactivate
                  </button>
                </div>
                <button
                  onClick={() => setShowPermanentConfirm(true)}
                  className="btn-danger w-full flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4" /> Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Permanent Delete Final Confirm ──────────────────────────────────── */}
        {deleteTarget && showPermanentConfirm && (
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-dark-900 border border-rose-600/50 rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                <Flame className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">Are you absolutely sure?</h3>
              <p className="text-dark-400 text-sm">
                <span className="text-rose-400 font-semibold">"{deleteTarget.name}"</span> and{" "}
                <span className="text-rose-400 font-semibold">all its tasks</span> will be permanently
                erased from the database. There is no way to recover this.
              </p>
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                <p className="text-rose-400 text-xs font-medium">
                  ⚠️ This will also delete all student submissions linked to these tasks.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPermanentConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  Go Back
                </button>
                <button
                  onClick={confirmPermanentDelete}
                  className="btn-danger flex-1 flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4" /> Yes, Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}