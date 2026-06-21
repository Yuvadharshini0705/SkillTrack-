import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../utils/api";
import AdminSidebar from "../../components/admin/AdminSidebar";
import toast from "react-hot-toast";
import {
  Upload, Download, FileSpreadsheet, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, X, Loader2,
  BookOpen, ArrowRight, RotateCcw, FileDown,
  HelpCircle, Bug, Code2, Zap,
  Eye, Database, Info, AlertCircle, Search,
  ChevronUp, Filter, BarChart2, Sparkles, Clock,
} from "lucide-react";

// ── Constants — must mirror bulk_upload.py ────────────────────────────────────
const EXPECTED_COUNTS  = { mcq: 10, debug: 4, coding: 1 };
const TOTAL_PER_DAY    = Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0);
const MAX_FILE_SIZE_MB = 10;

// Auto-derived on backend — shown here for admin reference only
const DIFF_XP_MAP = {
  beginner:     10,
  intermediate: 20,
  advanced:     35,
  expert:       50,
};

const TYPE_TIME_MAP = {
  mcq:    "2 min",
  debug:  "5 min",
  coding: "10 min",
};

// ── Type / difficulty metadata ────────────────────────────────────────────────
const TYPE_META = {
  mcq:    { label: "MCQ",    Icon: HelpCircle, badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",       color: "text-blue-400"   },
  debug:  { label: "Debug",  Icon: Bug,        badge: "bg-orange-500/15 text-orange-400 border-orange-500/25", color: "text-orange-400" },
  coding: { label: "Coding", Icon: Code2,      badge: "bg-purple-500/15 text-purple-400 border-purple-500/25", color: "text-purple-400" },
};

const DIFF_META = {
  beginner:     { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  intermediate: { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",         dot: "bg-blue-400"    },
  advanced:     { badge: "bg-orange-500/15 text-orange-400 border-orange-500/25",   dot: "bg-orange-400"  },
  expert:       { badge: "bg-rose-500/15 text-rose-400 border-rose-500/25",         dot: "bg-rose-400"    },
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function exportErrorsCSV(failedRows) {
  const header = "row,title,reason";
  const lines  = failedRows.map(r =>
    `${r.row},"${(r.title || "").replace(/"/g, '""')}","${(r.reason || "").replace(/"/g, '""')}"`
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: "upload_errors.csv" });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatFileSize(bytes) {
  if (bytes < 1024)      return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = [
    { n: 1, label: "Course"  },
    { n: 2, label: "File"    },
    { n: 3, label: "Preview" },
    { n: 4, label: "Done"    },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
            current === s.n
              ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
              : current > s.n
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
              : "bg-dark-800 text-dark-600 border border-dark-700"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              current === s.n ? "bg-primary-500 text-white" :
              current > s.n  ? "bg-emerald-500 text-white" :
                               "bg-dark-700 text-dark-500"
            }`}>
              {current > s.n ? "✓" : s.n}
            </span>
            <span className="hidden sm:block">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-1 transition-all ${current > s.n ? "bg-emerald-500/50" : "bg-dark-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Info banner ───────────────────────────────────────────────────────────────
function InfoBanner() {
  const [showAuto, setShowAuto] = useState(false);

  return (
    <div className="rounded-2xl border border-primary-500/15 bg-primary-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-primary-400 shrink-0" />
        <p className="text-sm font-semibold text-primary-300">Required questions per day</p>
      </div>

      {/* Question counts */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(EXPECTED_COUNTS).map(([type, count]) => {
          const { Icon, color, label } = TYPE_META[type];
          return (
            <div key={type} className="bg-dark-900/60 rounded-xl px-4 py-3 border border-dark-700/50 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                type === "mcq" ? "bg-blue-500/15" : type === "debug" ? "bg-orange-500/15" : "bg-purple-500/15"
              }`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold font-mono leading-none ${color}`}>{count}</p>
                <p className="text-xs text-dark-500 mt-0.5">{label} questions</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-derived toggle */}
      <button
        onClick={() => setShowAuto(v => !v)}
        className="w-full flex items-center gap-2 py-1.5 text-xs transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-semibold text-emerald-400">Auto-derived values</span>
        <span className="text-dark-600 font-normal">— no need to fill these in your file</span>
        <span className="ml-auto text-dark-500">
          {showAuto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {showAuto && (
        <div className="space-y-3">
          {/* XP per difficulty */}
          <div className="rounded-xl border border-dark-700/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-800/60 border-b border-dark-700/50">
              <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <p className="text-xs font-semibold text-dark-300">XP earned on correct answer</p>
            </div>
            <div className="grid grid-cols-4 divide-x divide-dark-700/50">
              {Object.entries(DIFF_XP_MAP).map(([diff, xp]) => {
                const { badge, dot } = DIFF_META[diff];
                return (
                  <div key={diff} className="px-3 py-3 text-center space-y-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      {diff}
                    </span>
                    <p className="text-sm font-bold font-mono text-dark-100">{xp} XP</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time limit per type */}
          <div className="rounded-xl border border-dark-700/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-800/60 border-b border-dark-700/50">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <p className="text-xs font-semibold text-dark-300">Time limit per question type</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-dark-700/50">
              {Object.entries(TYPE_TIME_MAP).map(([type, time]) => {
                const { Icon, color, label } = TYPE_META[type];
                return (
                  <div key={type} className="px-3 py-3 text-center space-y-1.5">
                    <span className={`flex items-center justify-center gap-1 text-xs font-semibold ${color}`}>
                      <Icon className="w-3.5 h-3.5" />{label}
                    </span>
                    <p className="text-sm font-bold font-mono text-dark-100">{time}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer tip */}
      <div className="flex items-start gap-2 text-xs text-dark-400 leading-relaxed">
        <span className="shrink-0 mt-0.5">💡</span>
        <span>
          <span className="text-primary-300 font-semibold">Total: {TOTAL_PER_DAY} per day.</span>
          {" "}Upload more than the target — extras are randomly chosen at test time.
          No <code className="text-dark-300 bg-dark-800 px-1 rounded">course_slug</code> column needed — pick the course below.
        </span>
      </div>
    </div>
  );
}

// ── Course picker with search ─────────────────────────────────────────────────
function CoursePicker({ courses, selected, onSelect }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const ref      = useRef();
  const inputRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = courses
    .filter(c => c.is_active !== false)
    .filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all text-left ${
          selected
            ? "border-primary-500/40 bg-primary-500/8"
            : "border-dark-700 bg-dark-800/60 hover:border-dark-600"
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
          selected ? "bg-primary-500/15" : "bg-dark-700"
        }`}>
          {selected ? selected.icon : <BookOpen className="w-5 h-5 text-dark-500" />}
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <p className="font-semibold text-white text-sm">{selected.name}</p>
              <p className="text-xs text-dark-500 font-mono">{selected.slug}</p>
            </>
          ) : (
            <p className="text-dark-400 text-sm">Choose a course to upload questions for…</p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-2 left-0 right-0 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-dark-800">
            <div className="flex items-center gap-2 bg-dark-800 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-dark-500 shrink-0" />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="flex-1 bg-transparent text-sm text-dark-200 placeholder-dark-600 outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-dark-500 hover:text-dark-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-dark-500 text-sm py-6">No courses found</p>
            ) : filtered.map(c => {
              const id = c._id || c.id;
              const isSelected = selected?._id === id || selected?.id === id;
              return (
                <button key={id}
                  onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-800 transition-colors text-left ${isSelected ? "bg-dark-800" : ""}`}
                >
                  <span className="text-xl shrink-0">{c.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dark-100">{c.name}</p>
                    <p className="text-xs text-dark-500 font-mono">{c.slug}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ file, onFile, onClear }) {
  const [dragging,  setDragging]  = useState(false);
  const [sizeError, setSizeError] = useState(null);
  const inputRef = useRef();

  const handleFile = useCallback((f) => {
    setSizeError(null);
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setSizeError(`File too large — max ${MAX_FILE_SIZE_MB} MB (got ${formatFileSize(f.size)})`);
      return;
    }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setSizeError("Only .xlsx, .xls, or .csv files are accepted");
      return;
    }
    onFile(f);
  }, [onFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  if (file) {
    return (
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-dark-100 text-sm truncate">{file.name}</p>
          <p className="text-xs text-dark-500">{formatFileSize(file.size)}</p>
        </div>
        <button onClick={onClear} aria-label="Remove file"
          className="p-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0} aria-label="Upload file"
        onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer py-12 text-center select-none focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
          dragging
            ? "border-primary-400 bg-primary-500/8 scale-[1.01]"
            : "border-dark-700 hover:border-dark-600 hover:bg-dark-800/40"
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
        <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragging ? "text-primary-400" : "text-dark-600"}`} />
        <p className="text-dark-300 font-semibold">Drop your file here, or click to browse</p>
        <p className="text-dark-600 text-sm mt-1">.xlsx · .xls · .csv · max {MAX_FILE_SIZE_MB} MB</p>
      </div>
      {sizeError && (
        <p className="flex items-center gap-2 text-xs text-rose-400 px-1">
          <XCircle className="w-3.5 h-3.5 shrink-0" />{sizeError}
        </p>
      )}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <label className="flex items-center gap-3 flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 cursor-pointer hover:border-dark-600 transition-colors select-none">
      <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
        <div
          role="switch" aria-checked={checked} tabIndex={0}
          onKeyDown={e => (e.key === "Enter" || e.key === " ") && onChange(!checked)}
          onClick={() => onChange(!checked)}
          className={`w-10 h-5 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${checked ? "bg-emerald-500" : "bg-dark-600"}`}
        />
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform pointer-events-none ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      <div onClick={() => onChange(!checked)}>
        <p className="text-xs font-semibold text-dark-200">{label}</p>
        {sublabel && <p className="text-xs text-dark-600">{sublabel}</p>}
      </div>
    </label>
  );
}

// ── Count warnings ────────────────────────────────────────────────────────────
function CountWarnings({ warnings = [] }) {
  const [expanded, setExpanded] = useState(false);
  if (!warnings.length) return null;
  const visible = expanded ? warnings : warnings.slice(0, 3);
  return (
    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-yellow-500/8 hover:bg-yellow-500/12 transition-colors"
      >
        <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <p className="text-xs font-semibold text-yellow-300 flex-1 text-left">
          Count notices ({warnings.length})
        </p>
        {warnings.length > 3 && (
          expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-yellow-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-yellow-400" />
        )}
      </button>
      <div className="divide-y divide-yellow-500/10">
        {visible.map((w, i) => (
          <p key={i} className="px-4 py-2 text-xs text-yellow-400/80">{w}</p>
        ))}
      </div>
      {!expanded && warnings.length > 3 && (
        <button onClick={() => setExpanded(true)}
          className="w-full text-xs text-yellow-500 hover:text-yellow-300 py-2 transition-colors">
          +{warnings.length - 3} more
        </button>
      )}
    </div>
  );
}

// ── Day count row ─────────────────────────────────────────────────────────────
function DayCountRow({ day, counts }) {
  return (
    <div className="flex items-center gap-3 bg-dark-800/40 rounded-xl px-4 py-2.5 border border-dark-700/30">
      <span className="text-xs font-mono font-bold text-dark-400 w-12 shrink-0">Day {day}</span>
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {Object.entries(EXPECTED_COUNTS).map(([type, target]) => {
          const actual = counts[type] || 0;
          const { Icon, label } = TYPE_META[type];
          const ok = actual >= target;
          return (
            <span key={type} className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
              ok           ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : actual > 0 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                           : "bg-dark-700 text-dark-500 border-dark-600"
            }`}>
              <Icon className="w-3 h-3" />{label}: {actual}/{target}
            </span>
          );
        })}
      </div>
      {Object.entries(EXPECTED_COUNTS).every(([t, n]) => (counts[t] || 0) >= n)
        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        : <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />}
    </div>
  );
}

// ── Preview table ─────────────────────────────────────────────────────────────
function PreviewTable({ rows, errorCount, validCount, countWarnings = [] }) {
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [sortDir,  setSortDir]  = useState("asc");
  const [showDays, setShowDays] = useState(true);

  const dayTypeCounts = {};
  rows.filter(r => r.status === "valid").forEach(r => {
    const d = r.day;
    if (!dayTypeCounts[d]) dayTypeCounts[d] = {};
    dayTypeCounts[d][r.type] = (dayTypeCounts[d][r.type] || 0) + 1;
  });

  const displayed = rows
    .filter(r => {
      if (filter === "errors") return r.status === "error";
      if (filter === "valid")  return r.status === "valid";
      return true;
    })
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (r.title  || "").toLowerCase().includes(q) ||
        (r.type   || "").toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q) ||
        String(r.day || "").includes(q)
      );
    })
    .sort((a, b) => {
      const da = Number(a.day) || 0, db = Number(b.day) || 0;
      return sortDir === "asc" ? da - db : db - da;
    });

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",  value: rows.length,  color: "text-dark-200",    bg: "bg-dark-800"      },
          { label: "Valid",  value: validCount,   color: "text-emerald-400", bg: "bg-emerald-500/8" },
          { label: "Errors", value: errorCount,   color: errorCount > 0 ? "text-rose-400" : "text-dark-500",
                                                  bg:    errorCount > 0 ? "bg-rose-500/8" : "bg-dark-800"  },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center border border-dark-700/50`}>
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-dark-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-day breakdown */}
      {Object.keys(dayTypeCounts).length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDays(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-dark-400 uppercase tracking-wider hover:text-dark-200 transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Questions per day ({Object.keys(dayTypeCounts).length} days)
            {showDays ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showDays && (
            <div className="space-y-1.5">
              {Object.entries(dayTypeCounts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, counts]) => (
                  <DayCountRow key={day} day={day} counts={counts} />
                ))}
            </div>
          )}
        </div>
      )}

      <CountWarnings warnings={countWarnings} />

      {/* Filter + search + sort */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-dark-800/60 p-1 rounded-xl border border-dark-700/50 shrink-0">
          {[
            { key: "all",    label: `All (${rows.length})`    },
            { key: "valid",  label: `Valid (${validCount})`   },
            ...(errorCount > 0 ? [{ key: "errors", label: `Errors (${errorCount})` }] : []),
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === t.key ? "bg-dark-600 text-dark-100" : "text-dark-500 hover:text-dark-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-dark-600 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search rows…"
            className="flex-1 bg-transparent text-xs text-dark-300 placeholder-dark-600 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-dark-500 hover:text-dark-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
          className="flex items-center gap-1 px-3 py-1.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-xs text-dark-400 hover:text-dark-200 transition-colors shrink-0"
          title="Sort by day"
        >
          <Filter className="w-3 h-3" />
          Day {sortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* Table — difficulty cell shows auto XP below it */}
      <div className="rounded-2xl border border-dark-700/50 overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="py-10 text-center text-dark-500 text-sm">
              {search ? "No rows match your search" : "No rows to show"}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-dark-800 border-b border-dark-700 z-10">
                <tr>
                  {["Row", "Title", "Type", "Difficulty / XP", "Day", "Status"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-dark-400 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/60">
                {displayed.map((r, i) => {
                  const typeMeta = TYPE_META[r.type];
                  const diffMeta = DIFF_META[r.difficulty];
                  const autoXp   = DIFF_XP_MAP[r.difficulty];
                  return (
                    <tr key={i} className={r.status === "error" ? "bg-rose-500/5" : "hover:bg-dark-800/30 transition-colors"}>
                      <td className="px-3 py-2.5 text-dark-500 font-mono">{r.row}</td>
                      <td className="px-3 py-2.5 max-w-[160px]">
                        <p className="text-dark-200 truncate font-medium">{r.title}</p>
                        {r.reason && <p className="text-rose-400 text-xs mt-0.5 truncate" title={r.reason}>{r.reason}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        {typeMeta ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${typeMeta.badge}`}>
                            <typeMeta.Icon className="w-3 h-3" />{typeMeta.label}
                          </span>
                        ) : <span className="text-dark-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.difficulty ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border w-fit ${diffMeta?.badge || "bg-dark-700 text-dark-400 border-dark-600"}`}>
                              {r.difficulty}
                            </span>
                            {autoXp !== undefined && (
                              <span className="flex items-center gap-0.5 text-xs text-yellow-500/80 font-mono pl-0.5">
                                <Zap className="w-2.5 h-2.5" />{autoXp} XP
                              </span>
                            )}
                          </div>
                        ) : <span className="text-dark-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-dark-400 font-mono">{r.day ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        {r.status === "valid"
                          ? <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle2 className="w-3 h-3" />Valid</span>
                          : <span className="flex items-center gap-1 text-rose-400 font-semibold"><XCircle className="w-3 h-3" />Error</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-2 border-t border-dark-800 bg-dark-900/40 text-xs text-dark-600">
          Showing {displayed.length} of {rows.length} rows
          {search && ` · filtered by "${search}"`}
        </div>
      </div>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, onUploadMore }) {
  const passed = result.inserted > 0;
  return (
    <div className={`rounded-2xl border p-6 space-y-5 ${
      passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/20 bg-dark-800/40"
    }`}>
      <div className="text-center space-y-2">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
          passed ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-rose-500/10 border border-rose-500/20"
        }`}>
          {passed
            ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            : <XCircle      className="w-8 h-8 text-rose-400"    />}
        </div>
        <h3 className={`font-display text-xl font-bold ${passed ? "text-emerald-300" : "text-rose-300"}`}>
          {passed ? "Import Complete!" : "Nothing Imported"}
        </h3>
        <p className="text-dark-400 text-sm">{result.message}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Rows", value: result.total_rows,  color: "text-dark-200"    },
          { label: "Imported",   value: result.inserted,    color: "text-emerald-400" },
          { label: "Skipped",    value: result.error_count, color: result.error_count > 0 ? "text-rose-400" : "text-dark-500" },
        ].map(s => (
          <div key={s.label} className="bg-dark-800/60 rounded-xl p-3 text-center border border-dark-700/50">
            <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-dark-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-dark-800/60 rounded-xl px-4 py-3 border border-dark-700/50">
        <Zap className="w-4 h-4 text-primary-400 shrink-0" />
        <p className="text-xs text-dark-400">
          Status:{" "}
          <span className={`font-semibold ${result.auto_approved ? "text-emerald-400" : "text-yellow-400"}`}>
            {result.auto_approved
              ? "Auto-approved — students can see them now"
              : "Pending review — go to Tasks → Pending to approve"}
          </span>
        </p>
      </div>

      <CountWarnings warnings={result.count_warnings || []} />

      {result.failed_rows?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />{result.failed_rows.length} rows skipped
            </p>
            <button onClick={() => exportErrorsCSV(result.failed_rows)}
              className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-dark-200 border border-dark-700 hover:border-dark-600 px-3 py-1.5 rounded-lg transition-colors">
              <FileDown className="w-3.5 h-3.5" />Export errors
            </button>
          </div>
          <div className="rounded-xl border border-rose-500/20 overflow-hidden max-h-48 overflow-y-auto">
            {result.failed_rows.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-dark-800/60 last:border-0">
                <span className="text-xs font-mono text-dark-500 shrink-0 mt-0.5">#{r.row}</span>
                <div className="min-w-0">
                  <p className="text-xs text-dark-300 truncate">{r.title}</p>
                  <p className="text-xs text-rose-400 mt-0.5">{r.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onUploadMore}
          className="flex-1 flex items-center justify-center gap-2 btn-secondary py-3">
          <RotateCcw className="w-4 h-4" />Upload More
        </button>
        <a href="/admin/tasks"
          className="flex-1 flex items-center justify-center gap-2 btn-primary py-3">
          View Tasks<ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminBulkUploadPage() {
  const [courses,        setCourses]        = useState([]);
  const [selCourse,      setSelCourse]      = useState(null);
  const [file,           setFile]           = useState(null);
  const [autoApprove,    setAutoApprove]    = useState(false);
  const [step,           setStep]           = useState(1);
  const [previewing,     setPreviewing]     = useState(false);
  const [importing,      setImporting]      = useState(false);
  const [previewData,    setPreviewData]    = useState(null);
  const [result,         setResult]         = useState(null);
  const [tmplLoading,    setTmplLoading]    = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const topRef = useRef();
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    setLoadingCourses(true);
    api.get("/admin/courses")
      .then(r => setCourses(r.data))
      .catch(() => toast.error("Failed to load courses"))
      .finally(() => setLoadingCourses(false));
  }, []);

  const reset = useCallback(() => {
    setFile(null); setSelCourse(null); setAutoApprove(false);
    setStep(1); setPreviewData(null); setResult(null);
  }, []);

  const downloadTemplate = async (fmt = "xlsx") => {
    setTmplLoading(true);
    try {
      const res = await api.get(`/admin/bulk-upload/template?format=${fmt}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = Object.assign(document.createElement("a"), {
        href: url,
        download: fmt === "csv" ? "skilltrack_template.csv" : "skilltrack_template.xlsx",
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${fmt.toUpperCase()} template downloaded`);
    } catch {
      toast.error("Failed to download template");
    } finally {
      setTmplLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!selCourse || !file) return;
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("course_id", selCourse._id || selCourse.id);
      fd.append("preview_only", "true");
      const r = await api.post("/admin/bulk-upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreviewData(r.data);
      setStep(3);
      if (r.data.valid_count === 0) {
        toast.error("No valid rows found — check your file format");
      } else {
        toast.success(`${r.data.valid_count} valid rows found`);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Preview failed — check your file");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selCourse || !file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("course_id", selCourse._id || selCourse.id);
      fd.append("auto_approve", autoApprove ? "true" : "false");
      fd.append("preview_only", "false");
      const r = await api.post("/admin/bulk-upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(r.data);
      setStep(4);
      if (r.data.inserted > 0) {
        toast.success(`${r.data.inserted} questions imported!`);
      } else {
        toast.error("Nothing was imported");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const canPreview = selCourse && file && step <= 2;
  const canImport  = previewData && previewData.valid_count > 0 && step === 3;

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto" ref={topRef}>
        <div className="max-w-3xl mx-auto p-6 space-y-6">

          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Bulk Upload Questions</h1>
              <p className="text-dark-400 text-sm mt-1">
                Upload hundreds of questions at once from Excel or CSV
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {[
                { fmt: "xlsx", label: "Excel", iconColor: "text-emerald-400" },
                { fmt: "csv",  label: "CSV",   iconColor: "text-blue-400"    },
              ].map(({ fmt, label, iconColor }) => (
                <button
                  key={fmt}
                  onClick={() => downloadTemplate(fmt)}
                  disabled={tmplLoading}
                  className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-600 text-dark-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tmplLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className={`w-4 h-4 ${iconColor}`} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Info banner */}
          <InfoBanner />

          {/* Steps */}
          <Steps current={step} />

          {/* Step 4: Result */}
          {step === 4 && result && (
            <ResultCard result={result} onUploadMore={reset} />
          )}

          {/* Steps 1–3 */}
          {step < 4 && (
            <div className="space-y-5">

              {/* Step 1 — Course */}
              <div className={`card transition-all duration-200 ${step > 1 ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step >= 1 ? "bg-primary-500 text-white" : "bg-dark-700 text-dark-500"
                  }`}>1</div>
                  <h2 className="font-semibold text-dark-100">Select Course</h2>
                  {selCourse && step > 1 && (
                    <button onClick={() => { setStep(1); setPreviewData(null); }}
                      className="ml-auto text-xs text-primary-400 hover:text-primary-300 transition-colors">
                      Change
                    </button>
                  )}
                </div>

                {loadingCourses ? (
                  <div className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-dark-700 bg-dark-800/60">
                    <Loader2 className="w-5 h-5 animate-spin text-dark-500" />
                    <p className="text-dark-400 text-sm">Loading courses…</p>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <p className="text-dark-400 text-sm">No active courses found. Create a course first.</p>
                  </div>
                ) : (
                  <CoursePicker
                    courses={courses}
                    selected={selCourse}
                    onSelect={c => { setSelCourse(c); if (step === 1) setStep(2); }}
                  />
                )}
              </div>

              {/* Step 2 — File */}
              {step >= 2 && (
                <div className="card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <h2 className="font-semibold text-dark-100">Upload File</h2>
                    {selCourse && (
                      <span className="ml-auto text-xs">
                        <span className="text-primary-400 font-medium">{selCourse.icon} {selCourse.name}</span>
                      </span>
                    )}
                  </div>

                  <DropZone
                    file={file}
                    onFile={f => { setFile(f); setPreviewData(null); if (step === 3) setStep(2); }}
                    onClear={() => { setFile(null); setPreviewData(null); if (step === 3) setStep(2); }}
                  />

                  <div className="mt-4">
                    <Toggle
                      checked={autoApprove}
                      onChange={setAutoApprove}
                      label="Auto-approve on import"
                      sublabel="Students see questions immediately — skip manual review"
                    />
                  </div>

                  <button
                    onClick={handlePreview}
                    disabled={!canPreview || previewing}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-dark-200 font-semibold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  >
                    {previewing
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Validating…</>
                      : <><Eye className="w-4 h-4" />Validate &amp; Preview</>}
                  </button>
                </div>
              )}

              {/* Step 3 — Preview + import */}
              {step >= 3 && previewData && (
                <div className="card">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <h2 className="font-semibold text-dark-100">Preview Results</h2>
                    <span className="ml-auto text-xs text-dark-500 truncate max-w-[200px]">{file?.name}</span>
                  </div>

                  <PreviewTable
                    rows={previewData.rows}
                    validCount={previewData.valid_count}
                    errorCount={previewData.error_count}
                    countWarnings={previewData.count_warnings || []}
                  />

                  {previewData.error_count > 0 && previewData.valid_count === 0 && (
                    <div className="mt-4 flex items-start gap-3 bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-300">
                        All rows have errors. Fix your file and re-upload.
                        Download the template above to see the correct format.
                      </p>
                    </div>
                  )}

                  {previewData.error_count > 0 && previewData.valid_count > 0 && (
                    <div className="mt-4 flex items-start gap-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-300">
                        {previewData.error_count} rows will be skipped.
                        Only the {previewData.valid_count} valid rows will be imported.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { setStep(2); setPreviewData(null); }}
                      className="btn-secondary px-5"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!canImport || importing}
                      className="flex-1 flex items-center justify-center gap-2 btn-primary py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {importing
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</>
                        : <><Database className="w-4 h-4" />Import {previewData.valid_count} Questions{autoApprove ? " (auto-approve)" : ""}</>}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}