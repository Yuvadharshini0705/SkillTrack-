import { useState, useEffect, useRef } from "react";
import api from "../../utils/api";
import AdminSidebar from "../../components/admin/AdminSidebar";
import toast from "react-hot-toast";
import {
  CheckCircle2, XCircle, Plus, Loader2, Bot, User2,
  CheckCheck, Trash2, ChevronDown, ChevronUp, Search,
  Filter, BookOpen, Zap, HelpCircle, Bug,
  Code2, FileText, AlertTriangle, LayoutList, LayoutGrid,
  Upload, Download, FileUp, Eye, X, CheckSquare,
  Wand2, RefreshCw, Info, ChevronRight, Sparkles,
  AlertCircle, FileCheck
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────
const TYPE_META = {
  mcq:    { label: "MCQ",    Icon: HelpCircle, cls: "bg-blue-500/15 text-blue-400 border-blue-500/25"       },
  debug:  { label: "Debug",  Icon: Bug,        cls: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  coding: { label: "Code",   Icon: Code2,      cls: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
  theory: { label: "Theory", Icon: FileText,   cls: "bg-teal-500/15 text-teal-400 border-teal-500/25"       },
};
const DIFF_META = {
  beginner:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  intermediate: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  advanced:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  expert:       "bg-rose-500/15 text-rose-400 border-rose-500/25",
};
const STATUS_META = {
  pending:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  rejected: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV UPLOAD MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CSVUploadModal({ onClose, onSuccess }) {
  const [file,         setFile]         = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const [phase,        setPhase]        = useState("idle");   // idle | validating | validated | uploading | done
  const [validateOnly, setValidateOnly] = useState(true);
  const [autoApprove,  setAutoApprove]  = useState(false);
  const [results,      setResults]      = useState(null);
  const [filterMode,   setFilterMode]   = useState("all");    // all | errors | valid
  const fileRef = useRef(null);

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".csv")) {
      setFile(dropped);
      setResults(null);
    } else {
      toast.error("Please drop a .csv file");
    }
  };

  // ── Download template ────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const response = await api.get("/admin/tasks/csv-template", { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", "skilltrack_tasks_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template");
    }
  };

  // ── Validate (dry run) ───────────────────────────────────────────────────
  const runValidate = async () => {
    if (!file) return;
    setPhase("validating");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("validate_only", "true");
      const r = await api.post("/admin/tasks/upload-csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(r.data);
      setPhase("validated");
    } catch (e) {
      toast.error(e.response?.data?.error || "Validation failed");
      setPhase("idle");
    }
  };

  // ── Final insert ─────────────────────────────────────────────────────────
  const runInsert = async () => {
    if (!file) return;
    setPhase("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("validate_only", "false");
      fd.append("auto_approve",  autoApprove ? "true" : "false");
      const r = await api.post("/admin/tasks/upload-csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(r.data);
      setPhase("done");
      if (r.data.inserted > 0) {
        toast.success(`✅ ${r.data.inserted} tasks inserted!`);
        onSuccess();
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Upload failed");
      setPhase("validated");
    }
  };

  // ── Filtered result rows ─────────────────────────────────────────────────
  const filteredRows = results?.results?.filter(r => {
    if (filterMode === "errors") return r.status === "error";
    if (filterMode === "valid")  return r.status !== "error";
    return true;
  }) || [];

  const isDone        = phase === "done";
  const isValidated   = phase === "validated";
  const isLoading     = phase === "validating" || phase === "uploading";
  const hasErrors     = (results?.errors || 0) > 0;
  const canInsert     = isValidated && (results?.valid || 0) > 0;

  return (
    <div className="fixed inset-0 bg-dark-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/15 rounded-xl border border-primary-500/20">
              <FileUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Bulk CSV Upload</h2>
              <p className="text-xs text-dark-500">Validate first, then insert — no surprises</p>
            </div>
          </div>
          <button onClick={onClose} className="text-dark-500 hover:text-dark-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between bg-dark-800/60 rounded-xl border border-dark-700/50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-dark-200">New to CSV upload?</p>
                <p className="text-xs text-dark-500 mt-0.5">
                  Download the template with example rows and column instructions.
                </p>
              </div>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/25 text-primary-400 font-semibold px-4 py-2 rounded-xl text-sm transition-all shrink-0 ml-4">
              <Download className="w-4 h-4" /> Template
            </button>
          </div>

          {/* Drop zone */}
          {!file && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer py-12 text-center ${
                dragging
                  ? "border-primary-400 bg-primary-500/10"
                  : "border-dark-700 hover:border-dark-500 hover:bg-dark-800/40"
              }`}
            >
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResults(null); setPhase("idle"); }}} />
              <Upload className="w-10 h-10 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-300 font-medium">Drop your CSV here or click to browse</p>
              <p className="text-dark-600 text-sm mt-1">.csv files only · UTF-8 encoding recommended</p>
            </div>
          )}

          {/* File selected */}
          {file && (
            <div className="flex items-center gap-3 bg-dark-800/60 rounded-xl border border-dark-700/50 px-4 py-3">
              <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-100 truncate">{file.name}</p>
                <p className="text-xs text-dark-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              {phase === "idle" && (
                <button onClick={() => { setFile(null); setResults(null); }}
                  className="text-dark-500 hover:text-rose-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Options */}
          {file && !isDone && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 bg-dark-800/60 rounded-xl border border-dark-700/50 px-4 py-3 cursor-pointer hover:border-dark-600 transition-colors">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)} />
                  <div className={`w-9 h-5 rounded-full transition-colors ${autoApprove ? "bg-emerald-500" : "bg-dark-600"}`} />
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoApprove ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-dark-200">Auto-approve tasks</p>
                  <p className="text-xs text-dark-600">Students see them immediately</p>
                </div>
              </label>
              <div className="flex items-center gap-3 bg-dark-800/60 rounded-xl border border-dark-700/50 px-4 py-3">
                <CheckSquare className="w-4 h-4 text-primary-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-dark-200">Validate first</p>
                  <p className="text-xs text-dark-600">Always done before inserting</p>
                </div>
              </div>
            </div>
          )}

          {/* Validate button */}
          {file && phase === "idle" && (
            <button onClick={runValidate}
              className="w-full flex items-center justify-center gap-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-400 font-bold py-3 rounded-xl transition-all text-sm">
              <Eye className="w-4 h-4" /> Validate CSV (dry run)
            </button>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
              <span className="text-dark-300 text-sm">
                {phase === "validating" ? "Validating rows…" : "Inserting tasks…"}
              </span>
            </div>
          )}

          {/* Results */}
          {results && !isLoading && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Rows", value: results.total,  color: "text-dark-200",   bg: "bg-dark-800"       },
                  { label: isDone ? "Inserted" : "Valid",
                    value: isDone ? results.inserted : results.valid,
                    color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "Errors", value: results.errors, color: results.errors > 0 ? "text-rose-400" : "text-dark-500",
                    bg: results.errors > 0 ? "bg-rose-500/10" : "bg-dark-800" },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center border border-dark-700/50`}>
                    <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-dark-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 bg-dark-800/60 p-1 rounded-xl border border-dark-700/50">
                {[
                  { key: "all",    label: `All (${results.total})`            },
                  { key: "errors", label: `Errors (${results.errors})`,  show: results.errors > 0    },
                  { key: "valid",  label: `Valid (${results.valid})`           },
                ].filter(t => t.show !== false).map(t => (
                  <button key={t.key} onClick={() => setFilterMode(t.key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterMode === t.key ? "bg-dark-600 text-dark-100" : "text-dark-500 hover:text-dark-300"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Row list */}
              <div className="max-h-52 overflow-y-auto rounded-xl border border-dark-700/50 divide-y divide-dark-800/50">
                {filteredRows.map((r, i) => (
                  <div key={i} className={`px-4 py-2.5 flex items-start gap-3 ${r.status === "error" ? "bg-rose-500/5" : ""}`}>
                    <div className="shrink-0 mt-0.5">
                      {r.status === "error"
                        ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dark-500">Row {r.row}</span>
                        <span className="text-xs font-medium text-dark-200 truncate">{r.title}</span>
                        {r.type && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${TYPE_META[r.type]?.cls || ""}`}>
                            {r.type}
                          </span>
                        )}
                        {r.day && (
                          <span className="text-xs text-dark-500">Day {r.day}</span>
                        )}
                      </div>
                      {r.errors && (
                        <div className="mt-1 space-y-0.5">
                          {r.errors.map((err, j) => (
                            <p key={j} className="text-xs text-rose-400">• {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-dark-800 flex gap-3">
          {isDone ? (
            <button onClick={onClose} className="btn-primary flex-1">Done</button>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              {canInsert && (
                <button onClick={runInsert} disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  Insert {results?.valid} Valid Tasks
                  {autoApprove && " (auto-approved)"}
                </button>
              )}
              {isValidated && !canInsert && (
                <button onClick={() => { setFile(null); setResults(null); setPhase("idle"); }}
                  className="flex-1 flex items-center justify-center gap-2 btn-secondary">
                  <RefreshCw className="w-4 h-4" /> Fix & Re-upload
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE-BASED BUILDER MODAL
// Smarter create form: auto-fills topic/subtopic/difficulty from curriculum
// ─────────────────────────────────────────────────────────────────────────────
function RuleBuilderModal({ courses, onClose, onSuccess }) {
  const EMPTY = {
    course_id: "", title: "", task_type: "mcq", difficulty: "beginner",
    topic: "", subtopic: "", question: "", solution: "", explanation: "",
    option_a: "", option_b: "", option_c: "", option_d: "",
    correct_option: "A",
    key_points: "", word_limit: 150,
    buggy_code: "", expected_output: "", language: "javascript",
    hints: "", bug_count: 1,
    starter_code: "", constraints: "",
    xp_reward: 10, time_limit: 300,
    day_range_start: 1, day_range_end: 1,
    tags: "", is_recovery: false,
  };

  const [form,        setForm]        = useState(EMPTY);
  const [currInfo,    setCurrInfo]    = useState(null);   // curriculum auto-fill data
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [autoFilled,  setAutoFilled]  = useState(false);

  // Selected course object
  const selectedCourse = courses.find(c => (c._id || c.id) === form.course_id);

  // ── Fetch curriculum info when course or day changes ─────────────────────
  useEffect(() => {
    if (!form.course_id) { setCurrInfo(null); return; }
    const timer = setTimeout(async () => {
      setLoadingInfo(true);
      try {
        const r = await api.get(
          `/admin/tasks/curriculum-info?course_id=${form.course_id}&day=${form.day_range_start}`
        );
        setCurrInfo(r.data);
      } catch {
        setCurrInfo(null);
      } finally {
        setLoadingInfo(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.course_id, form.day_range_start]);

  // ── Auto-fill button ─────────────────────────────────────────────────────
  const applyAutoFill = () => {
    if (!currInfo) return;
    const xpMap = { beginner: 10, intermediate: 15, advanced: 20, expert: 25 };
    setForm(f => ({
      ...f,
      topic:      currInfo.topic,
      subtopic:   currInfo.subtopic,
      difficulty: currInfo.difficulty,
      xp_reward:  xpMap[currInfo.difficulty] || 10,
      day_range_end: f.day_range_start,
    }));
    setAutoFilled(true);
    toast.success("Fields auto-filled from curriculum!");
  };

  // ── Field helpers ────────────────────────────────────────────────────────
  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setAutoFilled(false); };

  // ── Build content from form fields ───────────────────────────────────────
  const buildContent = () => {
    const t = form.task_type;
    if (t === "mcq") {
      const options = [
        form.option_a && `A) ${form.option_a}`,
        form.option_b && `B) ${form.option_b}`,
        form.option_c && `C) ${form.option_c}`,
        form.option_d && `D) ${form.option_d}`,
      ].filter(Boolean);
      const correctLetter = form.correct_option.toUpperCase();
      const correctText = {A: form.option_a, B: form.option_b, C: form.option_c, D: form.option_d}[correctLetter] || "";
      return {
        question:       form.question,
        options,
        correct_option: correctLetter,
        correct_text:   correctText,
      };
    }
    if (t === "theory") return {
      question:      form.question,
      question_type: "short_answer",
      key_points:    form.key_points.split("|").map(s => s.trim()).filter(Boolean),
      word_limit:    Number(form.word_limit) || 150,
    };
    if (t === "debug") return {
      buggy_code:      form.buggy_code,
      language:        form.language,
      expected_output: form.expected_output,
      hints:           form.hints.split("|").map(s => s.trim()).filter(Boolean),
      bug_count:       Number(form.bug_count) || 1,
    };
    if (t === "coding") return {
      problem:      form.question,
      starter_code: form.starter_code,
      language:     form.language,
      constraints:  form.constraints.split("|").map(s => s.trim()).filter(Boolean),
      test_cases:   [],
    };
    return {};
  };

  // ── Validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.course_id)  { toast.error("Select a course");       return false; }
    if (!form.title.trim()){ toast.error("Title is required");    return false; }
    if (!form.topic.trim()){ toast.error("Topic is required");    return false; }
    if (!form.solution.trim()){ toast.error("Solution is required"); return false; }
    if (form.task_type === "mcq") {
      if (!form.option_a || !form.option_b) { toast.error("MCQ needs at least option A and B"); return false; }
      if (!["A","B","C","D"].includes(form.correct_option.toUpperCase())) {
        toast.error("Correct option must be A, B, C or D"); return false;
      }
    }
    if (form.task_type === "debug" && !form.buggy_code.trim()) {
      toast.error("Debug task needs buggy_code"); return false;
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSave = async (approve = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post("/admin/tasks/create", {
        course_id:       form.course_id,
        title:           form.title.trim(),
        task_type:       form.task_type,
        difficulty:      form.difficulty,
        topic:           form.topic.trim(),
        subtopic:        form.subtopic.trim(),
        content:         buildContent(),
        solution:        form.solution.trim(),
        explanation:     form.explanation.trim(),
        xp_reward:       Number(form.xp_reward) || 10,
        time_limit:      Number(form.time_limit) || 300,
        day_range_start: Number(form.day_range_start) || 1,
        day_range_end:   Number(form.day_range_end) || 1,
        tags:            form.tags.split(",").map(t => t.trim()).filter(Boolean),
        is_recovery:     form.is_recovery,
        status:          approve ? "approved" : "pending",
      });
      toast.success(approve ? "Task created & approved!" : "Task created (pending review)");
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  // ── Difficulty color ──────────────────────────────────────────────────────
  const diffColor = {
    beginner: "text-emerald-400", intermediate: "text-blue-400",
    advanced: "text-orange-400",  expert: "text-rose-400",
  }[form.difficulty] || "text-dark-400";

  const inputCls = "w-full bg-dark-800/80 border border-dark-700 text-dark-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 placeholder-dark-600 transition-all";
  const labelCls = "block text-xs font-medium text-dark-400 mb-1.5";

  return (
    <div className="fixed inset-0 bg-dark-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/15 rounded-xl border border-purple-500/20">
              <Wand2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Rule-Based Builder</h2>
              <p className="text-xs text-dark-500">Auto-fills topic/difficulty from curriculum · guided creation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-dark-500 hover:text-dark-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* ── Step 1: Course + Day ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 text-xs font-bold">1</span>
              Course & Day
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Course *</label>
                <select className={inputCls} value={form.course_id}
                  onChange={(e) => { set("course_id", e.target.value); setAutoFilled(false); }}>
                  <option value="">Select a course…</option>
                  {courses.filter(c => c.is_active !== false).map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Day Number *</label>
                <input type="number" min="1" className={inputCls}
                  value={form.day_range_start}
                  onChange={(e) => {
                    const d = parseInt(e.target.value) || 1;
                    setForm(f => ({ ...f, day_range_start: d, day_range_end: d }));
                  }} />
              </div>
            </div>

            {/* Curriculum info panel */}
            {form.course_id && (
              <div className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${
                currInfo ? "border-primary-500/25 bg-primary-500/5" : "border-dark-700/50 bg-dark-800/40"
              }`}>
                {loadingInfo ? (
                  <div className="flex items-center gap-2 text-sm text-dark-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching curriculum…
                  </div>
                ) : currInfo ? (
                  <>
                    <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-dark-500 mb-0.5">Topic</p>
                        <p className="text-dark-100 font-medium">{currInfo.topic}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500 mb-0.5">Subtopic</p>
                        <p className="text-dark-200">{currInfo.subtopic}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500 mb-0.5">Difficulty</p>
                        <p className={`font-semibold capitalize ${
                          {beginner:"text-emerald-400",intermediate:"text-blue-400",
                           advanced:"text-orange-400",expert:"text-rose-400"}[currInfo.difficulty]
                        }`}>{currInfo.difficulty}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="text-xs text-dark-600">{currInfo.existing_tasks} tasks for Day {currInfo.day}</p>
                      <button onClick={applyAutoFill}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                          autoFilled
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : "bg-purple-500/15 text-purple-400 border border-purple-500/25 hover:bg-purple-500/25"
                        }`}>
                        {autoFilled
                          ? <><CheckCircle2 className="w-3 h-3" /> Applied</>
                          : <><Sparkles className="w-3 h-3" /> Auto-fill</>}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-dark-500">Select a course to see curriculum info</p>
                )}
              </div>
            )}
          </section>

          {/* ── Step 2: Task Type & Core Fields ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 text-xs font-bold">2</span>
              Task Details
            </h3>

            {/* Task type selector */}
            <div>
              <label className={labelCls}>Task Type *</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(TYPE_META).map(([type, meta]) => {
                  const Icon = meta.Icon;
                  const active = form.task_type === type;
                  return (
                    <button key={type} onClick={() => set("task_type", type)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border font-medium text-xs transition-all ${
                        active
                          ? `border ${meta.cls} scale-[1.02]`
                          : "border-dark-700 text-dark-500 hover:border-dark-600 hover:text-dark-300"
                      }`}>
                      <Icon className="w-4 h-4" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Title *</label>
                <input className={inputCls} placeholder="Short descriptive title…"
                  value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Topic *</label>
                <input className={inputCls} placeholder="e.g. JavaScript Arrays"
                  value={form.topic} onChange={(e) => set("topic", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Subtopic</label>
                <input className={inputCls} placeholder="e.g. map / filter / reduce"
                  value={form.subtopic} onChange={(e) => set("subtopic", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Difficulty *</label>
                <select className={`${inputCls} ${diffColor} font-semibold`}
                  value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
                  {["beginner","intermediate","advanced","expert"].map(d => (
                    <option key={d} value={d} className="text-dark-100">{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>XP Reward</label>
                <input type="number" min="1" max="200" className={inputCls}
                  value={form.xp_reward} onChange={(e) => set("xp_reward", e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── Step 3: Type-specific content ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 text-xs font-bold">3</span>
              Question Content
            </h3>

            {/* MCQ */}
            {form.task_type === "mcq" && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Question *</label>
                  <textarea className={`${inputCls} resize-none`} rows={3}
                    value={form.question} onChange={(e) => set("question", e.target.value)}
                    placeholder="What will this code output? …" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["a","b","c","d"].map(letter => (
                    <div key={letter}>
                      <label className={labelCls}>Option {letter.toUpperCase()} {letter === "a" || letter === "b" ? "*" : ""}</label>
                      <input className={inputCls} placeholder={`Option ${letter.toUpperCase()}…`}
                        value={form[`option_${letter}`]}
                        onChange={(e) => set(`option_${letter}`, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className={labelCls}>Correct Option *</label>
                  <div className="flex gap-2">
                    {["A","B","C","D"].map(l => (
                      <button key={l} onClick={() => set("correct_option", l)}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                          form.correct_option === l
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "border-dark-700 text-dark-500 hover:border-dark-600"
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Theory */}
            {form.task_type === "theory" && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Question *</label>
                  <textarea className={`${inputCls} resize-none`} rows={3}
                    value={form.question} onChange={(e) => set("question", e.target.value)}
                    placeholder="Explain how … works in … and when to use it." />
                </div>
                <div>
                  <label className={labelCls}>Key Points (pipe-separated)</label>
                  <input className={inputCls} placeholder="point1|point2|point3"
                    value={form.key_points} onChange={(e) => set("key_points", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Word Limit</label>
                  <input type="number" className={inputCls} value={form.word_limit}
                    onChange={(e) => set("word_limit", e.target.value)} />
                </div>
              </div>
            )}

            {/* Debug */}
            {form.task_type === "debug" && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Context / What it should do</label>
                  <input className={inputCls} placeholder="The function should return…"
                    value={form.question} onChange={(e) => set("question", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Language</label>
                  <select className={inputCls} value={form.language}
                    onChange={(e) => set("language", e.target.value)}>
                    {["javascript","python","java","bash","typescript","cpp","csharp"].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Buggy Code *</label>
                  <textarea className={`${inputCls} font-mono text-xs resize-none`} rows={6}
                    value={form.buggy_code} onChange={(e) => set("buggy_code", e.target.value)}
                    placeholder="// paste buggy code here — one bug to fix" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Expected Output</label>
                    <input className={inputCls} placeholder="[2, 4, 6]"
                      value={form.expected_output} onChange={(e) => set("expected_output", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Bug Count</label>
                    <input type="number" min="1" max="5" className={inputCls}
                      value={form.bug_count} onChange={(e) => set("bug_count", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Hints (pipe-separated)</label>
                  <input className={inputCls} placeholder="Are you returning a value?|Check the arrow function syntax"
                    value={form.hints} onChange={(e) => set("hints", e.target.value)} />
                </div>
              </div>
            )}

            {/* Coding */}
            {form.task_type === "coding" && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Problem Statement *</label>
                  <textarea className={`${inputCls} resize-none`} rows={4}
                    value={form.question} onChange={(e) => set("question", e.target.value)}
                    placeholder="Write a function that takes … and returns …" />
                </div>
                <div>
                  <label className={labelCls}>Language</label>
                  <select className={inputCls} value={form.language}
                    onChange={(e) => set("language", e.target.value)}>
                    {["javascript","python","java","typescript","cpp","csharp"].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Starter Code</label>
                  <textarea className={`${inputCls} font-mono text-xs resize-none`} rows={4}
                    value={form.starter_code} onChange={(e) => set("starter_code", e.target.value)}
                    placeholder="function solve(input) {\n  // Your code here\n}" />
                </div>
                <div>
                  <label className={labelCls}>Constraints (pipe-separated)</label>
                  <input className={inputCls} placeholder="n >= 0|Return a number, not a string"
                    value={form.constraints} onChange={(e) => set("constraints", e.target.value)} />
                </div>
              </div>
            )}

            {/* Solution & Explanation — all types */}
            <div>
              <label className={labelCls}>
                Solution * — {form.task_type === "mcq" ? "correct letter (A/B/C/D)" : "model answer / fixed code"}
              </label>
              {form.task_type === "debug" || form.task_type === "coding" ? (
                <textarea className={`${inputCls} font-mono text-xs resize-none`} rows={5}
                  value={form.solution} onChange={(e) => set("solution", e.target.value)}
                  placeholder="// complete working solution" />
              ) : (
                <input className={inputCls}
                  value={form.solution} onChange={(e) => set("solution", e.target.value)}
                  placeholder={form.task_type === "mcq" ? "A" : "Model answer text…"} />
              )}
            </div>
            <div>
              <label className={labelCls}>Explanation</label>
              <textarea className={`${inputCls} resize-none`} rows={2}
                value={form.explanation} onChange={(e) => set("explanation", e.target.value)}
                placeholder="Why this answer is correct…" />
            </div>
          </section>

          {/* ── Step 4: Metadata ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 text-xs font-bold">4</span>
              Metadata
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Time Limit (s)</label>
                <input type="number" className={inputCls} value={form.time_limit}
                  onChange={(e) => set("time_limit", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Day Start</label>
                <input type="number" min="1" className={inputCls} value={form.day_range_start}
                  onChange={(e) => {
                    const d = parseInt(e.target.value) || 1;
                    setForm(f => ({ ...f, day_range_start: d, day_range_end: Math.max(d, f.day_range_end) }));
                  }} />
              </div>
              <div>
                <label className={labelCls}>Day End</label>
                <input type="number" min={form.day_range_start} className={inputCls} value={form.day_range_end}
                  onChange={(e) => set("day_range_end", parseInt(e.target.value) || form.day_range_start)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Tags (comma-separated)</label>
              <input className={inputCls} placeholder="javascript, arrays, beginner"
                value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_recovery}
                onChange={(e) => set("is_recovery", e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm text-dark-400">Mark as Recovery Task</span>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-800 flex gap-3">
          <button onClick={onClose} className="btn-secondary px-6">Cancel</button>
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-dark-200 font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Save (Pending Review)
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 btn-primary disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save & Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Row
// ─────────────────────────────────────────────────────────────────────────────
function TaskRow({ task, onReview, onDelete }) {
  const taskId = task._id || task.id;
  const tm = TYPE_META[task.task_type] || TYPE_META.mcq;
  const Icon = tm.Icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-dark-700/20 transition-colors group">
      <div className={`p-1.5 rounded-lg shrink-0 border ${tm.cls}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-100 truncate">{task.title}</p>
        <p className="text-xs text-dark-500 truncate">
          {task.course_name ? `${task.course_name} · ` : ""}
          {task.topic}{task.subtopic ? ` · ${task.subtopic}` : ""}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${tm.cls}`}>{tm.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${DIFF_META[task.difficulty] || ""}`}>
          {task.difficulty}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-dark-700 text-dark-400 border border-dark-600">
          Day {task.day_range_start === task.day_range_end ? task.day_range_start : `${task.day_range_start}–${task.day_range_end}`}
        </span>
        <span className="text-xs text-yellow-500 flex items-center gap-0.5 w-14 justify-end">
          <Zap className="w-3 h-3" />{task.xp_reward}
        </span>
      </div>
      <span className={`hidden md:flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium border shrink-0 ${
        task.source === "ai"
          ? "bg-purple-500/15 text-purple-400 border-purple-500/25"
          : "bg-slate-500/15 text-slate-400 border-slate-500/25"
      }`}>
        {task.source === "ai" ? <Bot className="w-3 h-3" /> : <User2 className="w-3 h-3" />}
        {task.source === "ai" ? "AI" : "Manual"}
      </span>
      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border shrink-0 ${STATUS_META[task.status] || ""}`}>
        {task.status}
      </span>
      <div className={`flex items-center gap-1.5 shrink-0 ${task.status !== "pending" ? "opacity-0 group-hover:opacity-100" : ""} transition-opacity`}>
        {task.status !== "approved" && (
          <button onClick={() => onReview(taskId, "approve")}
            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors">
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
        {task.status === "pending" && (
          <button onClick={() => onReview(taskId, "reject")}
            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onDelete(taskId)}
          className="p-1.5 rounded-lg bg-dark-700 hover:bg-rose-500/15 text-dark-500 hover:text-rose-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Course Group
// ─────────────────────────────────────────────────────────────────────────────
function CourseGroup({ courseName, tasks, onReview, onDelete, onBulkApprove, defaultOpen }) {
  const [open,      setOpen]      = useState(defaultOpen);
  const [approving, setApproving] = useState(false);

  const pending  = tasks.filter(t => t.status === "pending").length;
  const approved = tasks.filter(t => t.status === "approved").length;
  const byType   = tasks.reduce((acc, t) => { acc[t.task_type] = (acc[t.task_type]||0)+1; return acc; }, {});

  const handleBulkApprove = async () => {
    setApproving(true);
    await onBulkApprove(tasks[0]?.course_id);
    setApproving(false);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      pending > 0 ? "border-yellow-500/20" : "border-dark-700/50"
    } bg-dark-800/40`}>
      <button onClick={() => setOpen(p => !p)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-dark-700/20 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/20 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-dark-100 text-sm">{courseName}</span>
            <div className="flex gap-1">
              {Object.entries(byType).map(([type, count]) => {
                const m = TYPE_META[type]; if (!m) return null;
                return (
                  <span key={type} className={`text-xs px-1.5 py-0.5 rounded font-medium border ${m.cls}`}>{count}</span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-dark-500">
            <span>{tasks.length} tasks</span>
            {pending  > 0 && <span className="text-yellow-400">{pending} pending</span>}
            {approved > 0 && <span className="text-emerald-400">{approved} approved</span>}
          </div>
        </div>
        {pending > 0 && (
          <button onClick={e => { e.stopPropagation(); handleBulkApprove(); }}
            disabled={approving}
            className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 font-semibold px-3 py-1.5 rounded-xl text-xs transition-all shrink-0 disabled:opacity-50">
            {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Approve {pending}
          </button>
        )}
        {pending === 0 && approved === tasks.length && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> All approved
          </span>
        )}
        <div className="text-dark-500 shrink-0 ml-1">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-dark-700/40 divide-y divide-dark-800/50">
          {tasks.map(t => (
            <TaskRow key={t._id || t.id} task={t} onReview={onReview} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminTasksPage() {
  const [tasks,       setTasks]       = useState([]);
  const [courses,     setCourses]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [status,      setStatus]      = useState("pending");
  const [source,      setSource]      = useState("");
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [groupView,   setGroupView]   = useState(true);
  const [approving,   setApproving]   = useState(false);
  const [courseMap,   setCourseMap]   = useState({});

  // Modal states
  const [showCSV,     setShowCSV]     = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Load courses once
  useEffect(() => {
    api.get("/admin/courses").then(r => {
      setCourses(r.data);
      const map = {};
      r.data.forEach(c => { map[c._id || c.id] = c; });
      setCourseMap(map);
    });
  }, []);

  const loadTasks = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 200 });
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    api.get(`/admin/tasks?${params}`).then(r => {
      const enriched = (r.data.tasks || []).map(t => ({
        ...t,
        course_name:  courseMap[t.course_id]?.name  || "Unknown Course",
        course_icon:  courseMap[t.course_id]?.icon  || "📚",
        course_color: courseMap[t.course_id]?.color || "#6366f1",
      }));
      setTasks(enriched);
      setTotal(r.data.total);
      setPages(r.data.pages);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { if (Object.keys(courseMap).length > 0 || courses.length === 0) loadTasks(); },
    [page, status, source, courseMap]);

  const filtered = search.trim()
    ? tasks.filter(t =>
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.topic?.toLowerCase().includes(search.toLowerCase()) ||
        t.course_name?.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  const groups = filtered.reduce((acc, t) => {
    const key = t.course_name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const pendingCount = tasks.filter(t => t.status === "pending").length;

  const review = async (taskId, action) => {
    try {
      await api.post(`/admin/tasks/${taskId}/review`, { action });
      toast.success(`Task ${action}d`);
      loadTasks();
    } catch { toast.error("Action failed"); }
  };

  const deleteTask = async (taskId) => {
    if (!confirm("Delete this task permanently?")) return;
    try {
      await api.delete(`/admin/tasks/${taskId}`);
      toast.success("Task deleted");
      loadTasks();
    } catch { toast.error("Delete failed"); }
  };

  const bulkApproveGroup = async (courseId) => {
    try {
      const course = courseMap[courseId];
      if (course) await api.post("/admin/tasks/bulk-approve", { course_slug: course.slug });
      else        await api.post("/admin/tasks/bulk-approve");
      toast.success("Group approved!");
      loadTasks();
    } catch { toast.error("Approve failed"); }
  };

  const bulkApproveAll = async () => {
    setApproving(true);
    try {
      const r = await api.post("/admin/tasks/bulk-approve");
      toast.success(r.data.message);
      loadTasks();
    } catch { toast.error("Bulk approve failed"); }
    finally { setApproving(false); }
  };

  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    const ap = groups[a].filter(t => t.status === "pending").length;
    const bp = groups[b].filter(t => t.status === "pending").length;
    return bp - ap;
  });

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Task Management</h1>
              <p className="text-dark-400 text-sm">{total} tasks total</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {status === "pending" && pendingCount > 0 && (
                <button onClick={bulkApproveAll} disabled={approving}
                  className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                  Approve All ({pendingCount})
                </button>
              )}

              {/* CSV Upload */}
              <button onClick={() => setShowCSV(true)}
                className="flex items-center gap-2 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/25 text-teal-400 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                <Upload className="w-4 h-4" /> CSV Upload
              </button>

              {/* Rule Builder */}
              <button onClick={() => setShowBuilder(true)}
                className="flex items-center gap-2 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/25 text-purple-400 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                <Wand2 className="w-4 h-4" /> Rule Builder
              </button>
            </div>
          </div>

          {/* ── Info strip: what each button does ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-3 bg-teal-500/5 border border-teal-500/15 rounded-xl px-4 py-3">
              <Upload className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-teal-300">CSV Upload</p>
                <p className="text-xs text-dark-500 mt-0.5">
                  Bulk-import questions from a spreadsheet. Download the template, fill it in, validate, then insert.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-purple-500/5 border border-purple-500/15 rounded-xl px-4 py-3">
              <Wand2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-purple-300">Rule Builder</p>
                <p className="text-xs text-dark-500 mt-0.5">
                  Smart form that auto-fills topic, subtopic & difficulty from the curriculum when you pick a course + day.
                </p>
              </div>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5 bg-dark-800/60 p-1 rounded-xl border border-dark-700/50">
              {[
                { value: "",         label: "All"      },
                { value: "pending",  label: "Pending"  },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ].map(s => (
                <button key={s.value} onClick={() => { setStatus(s.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    status === s.value
                      ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                      : "text-dark-400 hover:text-dark-200"
                  }`}>
                  {s.label}
                  {s.value === "pending" && pendingCount > 0 && (
                    <span className="ml-1.5 bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 bg-dark-800/60 p-1 rounded-xl border border-dark-700/50">
              {[
                { value: "",       label: "All Sources" },
                { value: "manual", label: "Manual", icon: <User2 className="w-3 h-3" /> },
              ].map(s => (
                <button key={s.value} onClick={() => { setSource(s.value); setPage(1); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    source === s.value ? "bg-dark-600 text-dark-100" : "text-dark-400 hover:text-dark-200"
                  }`}>
                  {s.icon}{s.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-48 max-w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
              <input
                className="w-full bg-dark-800/60 border border-dark-700/50 text-dark-100 text-sm rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-primary-500/50 placeholder-dark-600"
                placeholder="Search tasks…" value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="flex gap-1 bg-dark-800/60 p-1 rounded-xl border border-dark-700/50 ml-auto">
              <button onClick={() => setGroupView(true)}
                className={`p-1.5 rounded-lg transition-all ${groupView ? "bg-dark-600 text-dark-100" : "text-dark-500 hover:text-dark-300"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setGroupView(false)}
                className={`p-1.5 rounded-lg transition-all ${!groupView ? "bg-dark-600 text-dark-100" : "text-dark-500 hover:text-dark-300"}`}>
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Pending alert ── */}
          {status === "" && pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/8 border border-yellow-500/20 rounded-2xl px-5 py-3.5">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-300">
                <strong>{pendingCount}</strong> tasks awaiting review.
              </p>
              <button onClick={() => setStatus("pending")}
                className="ml-auto text-xs text-yellow-400 hover:text-yellow-200 border border-yellow-500/30 px-3 py-1 rounded-lg transition-colors">
                Show pending →
              </button>
            </div>
          )}

          {/* ── Content ── */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl py-14 text-center border border-dark-700/50">
              <Filter className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-dark-400 font-medium">No tasks found</p>
              <p className="text-dark-600 text-sm mt-1">Try adjusting your filters or upload tasks via CSV</p>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => setShowCSV(true)}
                  className="flex items-center gap-2 text-sm text-teal-400 border border-teal-500/30 px-4 py-2 rounded-xl hover:bg-teal-500/10 transition-colors">
                  <Upload className="w-4 h-4" /> Upload CSV
                </button>
                <button onClick={() => setShowBuilder(true)}
                  className="flex items-center gap-2 text-sm text-purple-400 border border-purple-500/30 px-4 py-2 rounded-xl hover:bg-purple-500/10 transition-colors">
                  <Wand2 className="w-4 h-4" /> Rule Builder
                </button>
              </div>
            </div>
          ) : groupView ? (
            <div className="space-y-3">
              {sortedGroupKeys.map((courseName, i) => (
                <CourseGroup
                  key={courseName}
                  courseName={courseName}
                  tasks={groups[courseName]}
                  onReview={review}
                  onDelete={deleteTask}
                  onBulkApprove={bulkApproveGroup}
                  defaultOpen={i === 0 || groups[courseName].some(t => t.status === "pending")}
                />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden border border-dark-700/50">
              <div className="divide-y divide-dark-800/50">
                {filtered.map(t => (
                  <TaskRow key={t._id || t.id} task={t} onReview={review} onDelete={deleteTask} />
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!groupView && pages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    page === p ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" : "glass text-dark-400"
                  }`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {showCSV && (
        <CSVUploadModal
          onClose={() => setShowCSV(false)}
          onSuccess={() => { loadTasks(); }}
        />
      )}

      {showBuilder && (
        <RuleBuilderModal
          courses={courses}
          onClose={() => setShowBuilder(false)}
          onSuccess={() => { loadTasks(); }}
        />
      )}
    </div>
  );
}