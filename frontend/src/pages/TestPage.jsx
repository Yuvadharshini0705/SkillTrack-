import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
  ArrowLeft, ArrowRight, Zap,
  CheckCircle2, XCircle, Lock, Loader2,
  HelpCircle, Bug, Code2, FileText, Trophy,
  Clock
} from "lucide-react";
import DebugQuestion from "../components/DebugQuestion";
import CodingQuestion from "../components/CodingQuestion";

const QUESTION_COUNTS = { mcq: 10, debug: 4, coding: 1 };
const TOTAL_QUESTIONS = 15;

const TYPE_ICON  = { mcq: HelpCircle, theory: FileText, debug: Bug, coding: Code2 };
const TYPE_LABEL = { mcq: "Multiple Choice", theory: "Theory", debug: "Debug Code", coding: "Coding Challenge" };
const TYPE_COLOR = {
  mcq:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
  theory: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  debug:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  coding: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDatetime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── MCQ ───────────────────────────────────────────────────────────────────────
function MCQQuestion({ task, answer, setAnswer, submitted }) {
  const { question, options = [] } = task.content || {};
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <p className="text-dark-100 leading-relaxed text-base">{question || task.description}</p>
      </div>
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const letter = opt.charAt(0).toUpperCase();
          const isSelected = answer === letter;
          const correctLetter = (task.solution || "").trim().toUpperCase()[0];
          let cls = "border-dark-700 glass-hover text-dark-300";
          if (submitted) {
            if (letter === correctLetter)
              cls = "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
            else if (isSelected && letter !== correctLetter)
              cls = "border-rose-500/50 bg-rose-500/10 text-rose-200";
            else
              cls = "border-dark-700 text-dark-500 opacity-50";
          } else if (isSelected) {
            cls = "border-primary-500/60 bg-primary-500/15 text-primary-200";
          }
          return (
            <button key={i} disabled={submitted} onClick={() => setAnswer(letter)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${cls} ${submitted ? "cursor-default" : ""}`}>
              <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold mr-3 shrink-0 ${
                submitted && letter === correctLetter ? "bg-emerald-500 text-white" :
                isSelected ? "bg-primary-500 text-white" : "bg-dark-700 text-dark-400"
              }`}>{letter}</span>
              {opt.length > 2 ? opt.substring(2).trim() : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Theory ────────────────────────────────────────────────────────────────────
function TheoryQuestion({ task, answer, setAnswer, submitted }) {
  const c = task.content || {};
  const wordCount = (answer || "").trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 space-y-2">
        <p className="text-dark-100 leading-relaxed">{c.question || task.description}</p>
        {(c.key_points || []).length > 0 && (
          <div className="pt-2 space-y-1">
            <p className="text-xs font-semibold text-dark-500">Address these points:</p>
            {c.key_points.map((p, i) => <p key={i} className="text-xs text-dark-400">• {p}</p>)}
          </div>
        )}
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-dark-500">Your answer (min 30 words)</span>
          <span className={wordCount >= 30 ? "text-emerald-400" : "text-dark-500"}>
            {wordCount} / {c.word_limit || 150} words
          </span>
        </div>
        <textarea disabled={submitted} value={answer || ""}
          onChange={(e) => setAnswer(e.target.value)}
          className="input-field resize-none w-full disabled:opacity-60"
          rows={7} placeholder="Write at least 30 words..." />
      </div>
      {submitted && (
        <div className="glass rounded-xl p-4 border border-teal-500/20">
          <p className="text-xs font-semibold text-teal-400 mb-1">Model answer</p>
          <p className="text-sm text-dark-300 leading-relaxed">{task.solution}</p>
        </div>
      )}
    </div>
  );
}

// ── Inline result ─────────────────────────────────────────────────────────────
function InlineResult({ result }) {
  if (!result) return null;
  return (
    <div className={`rounded-xl p-4 border flex gap-3 ${
      result.is_correct ? "bg-emerald-500/10 border-emerald-500/30" : "bg-dark-800/60 border-dark-700"
    }`}>
      {result.is_correct
        ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        : <XCircle className="w-5 h-5 text-dark-500 shrink-0 mt-0.5" />}
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${result.is_correct ? "text-emerald-300" : "text-dark-400"}`}>
            {result.is_correct ? "Correct!" : "Incorrect"}
          </span>
          {result.xp_earned > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
              <Zap className="w-3 h-3" />+{result.xp_earned} XP
            </span>
          )}
        </div>
        {result.explanation && (
          <p className="text-xs text-dark-400 leading-relaxed">{result.explanation}</p>
        )}
      </div>
    </div>
  );
}

// ── Type breakdown pills ──────────────────────────────────────────────────────
function TypeBreakdown({ tasks }) {
  const counts = {};
  tasks.forEach(t => { counts[t.task_type] = (counts[t.task_type] || 0) + 1; });
  const colors = {
    mcq:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
    debug:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
    coding: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Object.entries(counts).map(([type, n]) => (
        <span key={type} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[type] || "text-dark-400 bg-dark-700 border-dark-600"}`}>
          {n} {type.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

// ── Generating screen ─────────────────────────────────────────────────────────
function GeneratingScreen({ day, lockedMsg }) {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(p => (p <= 1 ? 8 : p - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { label: `Analyzing curriculum for Day ${day}`,                done: true          },
    { label: `Selecting ${QUESTION_COUNTS.mcq} MCQ questions`,     done: countdown < 5 },
    { label: `Selecting ${QUESTION_COUNTS.debug} Debug challenges`, done: false         },
    { label: `Selecting ${QUESTION_COUNTS.coding} Coding task`,    done: false         },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center border border-primary-500/20 space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-primary-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-primary-500/30 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary-500/10 flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-white mb-1">
            Preparing Day {day} Questions
          </h2>
          <p className="text-dark-400 text-sm leading-relaxed">{lockedMsg}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "MCQ",    count: QUESTION_COUNTS.mcq,    color: "text-blue-400",   bg: "bg-blue-500/10"   },
            { label: "Debug",  count: QUESTION_COUNTS.debug,  color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Coding", count: QUESTION_COUNTS.coding, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-dark-700/30`}>
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.count}</div>
              <div className="text-xs text-dark-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="text-left space-y-2 bg-dark-800/60 rounded-xl p-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {s.done
                ? <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                : <div className="w-4 h-4 rounded-full border border-dark-600 shrink-0 animate-pulse" />
              }
              <span className={s.done ? "text-dark-300" : "text-dark-600"}>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-dark-500">
          <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          Auto-checking in {countdown}s…
        </div>
        <p className="text-xs text-dark-600">
          {TOTAL_QUESTIONS} questions total. This usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}

// ── Final screen ──────────────────────────────────────────────────────────────
function FinalScreen({ summary, day, onBack }) {
  const pct   = summary.percent || 0;
  const grade =
    pct >= 90 ? { label: "Excellent!", color: "text-emerald-400", emoji: "🏆" } :
    pct >= 70 ? { label: "Good job!",  color: "text-blue-400",    emoji: "🎯" } :
    pct >= 50 ? { label: "Not bad!",   color: "text-yellow-400",  emoji: "👍" } :
               { label: "Keep going!", color: "text-orange-400",  emoji: "💪" };

  const duration = summary.duration_seconds || 0;

  const byType = {};
  (summary.results || []).forEach(r => {
    const t = r.task_type || "mcq";
    if (!byType[t]) byType[t] = { correct: 0, total: 0 };
    byType[t].total += 1;
    if (r.is_correct) byType[t].correct += 1;
  });

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="glass rounded-3xl p-8 text-center border border-dark-700">
          <div className="text-5xl mb-3">{grade.emoji}</div>
          <h1 className={`font-display text-3xl font-bold ${grade.color} mb-1`}>{grade.label}</h1>
          <p className="text-dark-400">Day {day} complete</p>

          <div className="mt-6 mb-6">
            <div className="text-6xl font-display font-bold text-white">{pct}%</div>
            <p className="text-dark-500 text-sm mt-1">{summary.correct} / {summary.total} correct</p>
          </div>

          {Object.keys(byType).length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { type: "mcq",    label: "MCQ",    color: "text-blue-400"   },
                { type: "debug",  label: "Debug",  color: "text-orange-400" },
                { type: "coding", label: "Coding", color: "text-purple-400" },
              ].filter(s => byType[s.type]).map(s => {
                const d   = byType[s.type];
                const pct = Math.round((d.correct / d.total) * 100);
                return (
                  <div key={s.type} className="bg-dark-800/60 rounded-xl p-3 border border-dark-700/50">
                    <div className={`text-lg font-bold font-mono ${s.color}`}>{pct}%</div>
                    <div className="text-xs text-dark-500">{s.label}</div>
                    <div className="text-xs text-dark-600">{d.correct}/{d.total}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="glass rounded-2xl p-4 mb-5 border border-dark-700/50 space-y-2 text-left">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary-400" /> Test Timing
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-dark-600">Started</p>
                <p className="text-dark-200 font-medium">{fmtDatetime(summary.started_at)}</p>
              </div>
              <div>
                <p className="text-dark-600">Finished</p>
                <p className="text-dark-200 font-medium">{fmtDatetime(summary.submitted_at)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-dark-600">Total Duration</p>
                <p className="text-primary-400 font-bold text-sm">{fmtTime(duration)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-6 py-4 border-t border-b border-dark-700/50 mb-6">
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xl justify-center">
                <Zap className="w-5 h-5" />{summary.total_xp_earned}
              </div>
              <p className="text-xs text-dark-500 mt-0.5">XP earned</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xl justify-center">
                <CheckCircle2 className="w-5 h-5" />{summary.correct}
              </div>
              <p className="text-xs text-dark-500 mt-0.5">Correct</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-primary-400 font-bold text-xl justify-center">
                <Clock className="w-5 h-5" />{fmtTime(duration)}
              </div>
              <p className="text-xs text-dark-500 mt-0.5">Time taken</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="glass rounded-xl p-3 border border-dark-700/50 flex items-center gap-2">
              <Lock className="w-4 h-4 text-dark-500 shrink-0" />
              <p className="text-xs text-dark-400">
                {summary.passed
                  ? `Day ${day + 1} unlocks at midnight IST.`
                  : `Score ≥ 60% to unlock Day ${day + 1}.`}
              </p>
            </div>
            <button onClick={onBack} className="btn-primary w-full py-3">Back to Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main TestPage ──────────────────────────────────────────────────────────────
export default function TestPage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();

  const [loading,         setLoading]         = useState(true);
  const [tasks,           setTasks]           = useState([]);
  const [day,             setDay]             = useState(1);
  const [status,          setStatus]          = useState("loading");
  const [lockedMsg,       setLockedMsg]       = useState("");
  const [currentIdx,      setCurrentIdx]      = useState(0);

  // ── FIX 4: replaced confirm() with this state ──────────────────────────────
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [answers,    setAnswers]    = useState({});
  const [autoScores, setAutoScores] = useState({});
  const [hints,      setHints]      = useState({});
  const [results,    setResults]    = useState({});
  const [submitted,  setSubmitted]  = useState({});
  const [timers,     setTimers]     = useState({});

  const [finalScore, setFinalScore] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const testStartRef = useRef(null);
  const [elapsed,    setElapsed]   = useState(0);
  const elapsedRef   = useRef(null);
  const timerRef     = useRef(null);
  const pollGenRef   = useRef(null);

  // ── Start test helper ──────────────────────────────────────────────────────
  const startTest = (taskList, dayNum) => {
    setTasks(taskList);
    setDay(dayNum);
    setStatus("ready");
    const t = {};
    taskList.forEach(task => { t[task._id || task.id] = 0; });
    setTimers(t);
    testStartRef.current = new Date();
    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - testStartRef.current.getTime()) / 1000));
    }, 1000);
  };

  // ── Load test ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const dayParam = params.get("day");

    api.get(`/student/daily-test?course_id=${courseId}${dayParam ? `&day=${dayParam}` : ""}`)
      .then((r) => {
        const d = r.data;
        if (d.status === "ready") {
          startTest(d.tasks, d.day);
        } else if (d.status === "generating") {
          setDay(d.day);
          setStatus("generating");
          setLockedMsg(d.message || "Preparing your questions…");
          pollGenRef.current = setInterval(async () => {
            try {
              const poll = await api.get(
                `/student/daily-test?course_id=${courseId}${dayParam ? `&day=${dayParam}` : ""}`
              );
              if (poll.data.status === "ready") {
                clearInterval(pollGenRef.current);
                startTest(poll.data.tasks, poll.data.day);
              }
            } catch { /* keep polling */ }
          }, 8000);
        } else if (d.status === "locked") {
          setDay(d.day); setStatus("locked"); setLockedMsg(d.message);
        } else if (d.status === "completed") {
          setDay(d.day); setStatus("completed"); setLockedMsg(d.message);
        }
      })
      .catch(() => toast.error("Failed to load test"))
      .finally(() => setLoading(false));

    return () => {
      clearInterval(elapsedRef.current);
      clearInterval(timerRef.current);
      clearInterval(pollGenRef.current);
    };
  }, [courseId]);

  // ── Per-question timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "ready" || !tasks[currentIdx]) return;
    const taskId = tasks[currentIdx]._id || tasks[currentIdx].id;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimers((prev) => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIdx, status]);

  // ── FIX 5: Stop all timers when test is finished ───────────────────────────
  useEffect(() => {
    if (finalScore) {
      clearInterval(elapsedRef.current);
      clearInterval(timerRef.current);
    }
  }, [finalScore]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentTask = tasks[currentIdx];
  const taskId      = currentTask?._id || currentTask?.id;
  const isSubmitted = submitted[taskId];
  const isLastQ     = currentIdx === tasks.length - 1;

  // ── FIX 1: Check if ALL questions are submitted (for Finish button) ────────
  const allSubmitted = tasks.length > 0 && tasks.every(t => submitted[t._id || t.id]);

  // ── FIX 2: Progress based on how many questions are submitted ─────────────
  const submittedCount = Object.keys(submitted).length;
  const progress = tasks.length > 0 ? (submittedCount / tasks.length) * 100 : 0;

  // ── Can submit current question ───────────────────────────────────────────
  const canSubmitOne = () => {
    if (isSubmitted || !currentTask) return false;
    const type = currentTask.task_type;
    if (type === "mcq")
      return (answers[taskId] || "").length > 0;
    if (type === "theory")
      return (answers[taskId] || "").trim().split(/\s+/).filter(Boolean).length >= 30;
    if (type === "debug" || type === "coding")
      return autoScores[taskId] !== undefined;
    return false;
  };

  // ── Get answer to send to backend ─────────────────────────────────────────
  const getSubmitAnswer = (task, tid) => {
    const type = task.task_type;
    if (type === "debug" || type === "coding")
      return String(autoScores[tid] ?? 0);
    return answers[tid] || "";
  };

  // ── Submit one question locally ───────────────────────────────────────────
  const submitOne = () => {
    const task = currentTask;
    const type = task.task_type;
    let is_correct = false;
    let score      = 0;

    if (type === "mcq") {
      const correct = (task.solution || "").trim().toUpperCase()[0];
      const given   = (answers[taskId] || "").trim().toUpperCase()[0];
      is_correct = !!(correct && given && correct === given);
      score = is_correct ? 100 : 0;
    } else if (type === "theory") {
      const words = (answers[taskId] || "").trim().split(/\s+/).filter(Boolean).length;
      is_correct  = words >= 30;
      score       = is_correct ? Math.min(100, words) : 0;
    } else if (type === "debug") {
      const s    = autoScores[taskId] ?? 0;
      is_correct = s >= 80;
      score      = s;
    } else if (type === "coding") {
      const s    = autoScores[taskId] ?? 0;
      is_correct = s >= 70;
      score      = s;
    }

    const hintsUsed = hints[taskId] || 0;
    const xp_earned = is_correct ? Math.max((task.xp_reward || 10) - hintsUsed * 2, 1) : 0;

    setResults((prev) => ({
      ...prev,
      [taskId]: { is_correct, xp_earned, explanation: task.explanation, solution: task.solution }
    }));
    setSubmitted((prev) => ({ ...prev, [taskId]: true }));
    if (is_correct) toast.success(`+${xp_earned} XP!`, { icon: "⚡" });
  };

  // ── Submit all to backend ─────────────────────────────────────────────────
  const submitAll = async () => {
    setSubmitting(true);
    clearInterval(elapsedRef.current);
    const finishedAt      = new Date();
    const durationSeconds = Math.floor(
      (finishedAt.getTime() - (testStartRef.current?.getTime() || finishedAt.getTime())) / 1000
    );

    try {
      const answersPayload = tasks.map((t) => {
        const tid = t._id || t.id;
        return {
          task_id:      tid,
          answer_given: getSubmitAnswer(t, tid),
          hints_used:   hints[tid] || 0,
          time_taken:   timers[tid] || 0,
        };
      });

      const r = await api.post("/student/submit-test", {
        course_id:        courseId,
        day,
        answers:          answersPayload,
        started_at:       testStartRef.current?.toISOString(),
        submitted_at:     finishedAt.toISOString(),
        duration_seconds: durationSeconds,
      });

      setFinalScore({
        ...r.data,
        results: answersPayload.map((a, i) => ({
          ...a,
          task_type:  tasks[i]?.task_type,
          is_correct: results[a.task_id]?.is_correct || false,
        })),
        started_at:       testStartRef.current?.toISOString(),
        submitted_at:     finishedAt.toISOString(),
        duration_seconds: durationSeconds,
      });
    } catch (e) {
      if (e.response?.data?.already_done) toast.error("Already submitted!");
      else toast.error("Submission failed. Try again.");
      elapsedRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (testStartRef.current?.getTime() || Date.now())) / 1000));
      }, 1000);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status screens ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
    </div>
  );

  if (status === "generating") return (
    <GeneratingScreen day={day} lockedMsg={lockedMsg} />
  );

  if (status === "locked") return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center border border-dark-700">
        <Lock className="w-12 h-12 text-dark-500 mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold text-white mb-2">Day {day} Not Ready</h2>
        <p className="text-dark-400 text-sm mb-6">{lockedMsg}</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary w-full">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (status === "completed") return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center border border-emerald-500/20">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold text-white mb-2">Already Complete!</h2>
        <p className="text-dark-400 text-sm mb-6">{lockedMsg}</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary w-full">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (finalScore) return (
    <FinalScreen summary={finalScore} day={day} onBack={() => navigate("/dashboard")} />
  );

  if (!currentTask) return null;

  // ── Task groups for dot navigation ────────────────────────────────────────
  const mcqTasks    = tasks.filter(t => t.task_type === "mcq");
  const debugTasks  = tasks.filter(t => t.task_type === "debug");
  const codingTasks = tasks.filter(t => t.task_type === "coding");

  const TypeIcon = TYPE_ICON[currentTask.task_type] || HelpCircle;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-3xl mx-auto p-4 pb-10">

        {/* ── FIX 4: Exit confirmation modal ── */}
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl p-6 max-w-sm w-full border border-dark-700 text-center space-y-4">
              <h3 className="font-display text-lg font-bold text-white">Exit Test?</h3>
              <p className="text-dark-400 text-sm">
                Your progress will be lost. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 btn-secondary py-2.5"
                >
                  Stay
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 btn-danger py-2.5"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 py-4 mb-2">

          {/* ── FIX 4: Back button now opens modal instead of confirm() ── */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="glass-hover p-2 rounded-xl shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-dark-400" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-dark-400">
                Question {currentIdx + 1} of {tasks.length}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs font-mono text-dark-500">
                  <Clock className="w-3 h-3" />
                  {fmtTime(elapsed)}
                </span>
                <span className="text-xs font-semibold text-dark-500">Day {day}</span>
              </div>
            </div>

            {/* ── FIX 2: Progress bar uses submittedCount ── */}
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Start time + type breakdown */}
        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          {testStartRef.current && (
            <div className="flex items-center gap-1.5 text-xs text-dark-600">
              <Clock className="w-3 h-3" />
              <span>Started {fmtDatetime(testStartRef.current.toISOString())}</span>
            </div>
          )}
          <TypeBreakdown tasks={tasks} />
        </div>

        {/* Type badge + title */}
        <div className="mb-5">
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border mb-3 ${TYPE_COLOR[currentTask.task_type]}`}>
            <TypeIcon style={{ width: 13, height: 13 }} />
            {TYPE_LABEL[currentTask.task_type]}
          </div>
          <h2 className="font-display text-lg font-bold text-white leading-snug">{currentTask.title}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-dark-500">{currentTask.topic}</span>
            {currentTask.subtopic && (
              <span className="text-xs text-dark-600">· {currentTask.subtopic}</span>
            )}
            <span className="ml-auto flex items-center gap-1 text-xs text-yellow-500">
              <Zap style={{ width: 12, height: 12 }} />{currentTask.xp_reward} XP
            </span>
          </div>
        </div>

        {/* Question body */}
        <div className="space-y-4">

          {currentTask.task_type === "mcq" && (
            <MCQQuestion
              task={currentTask}
              answer={answers[taskId] || ""}
              setAnswer={(v) => setAnswers((p) => ({ ...p, [taskId]: v }))}
              submitted={isSubmitted}
            />
          )}

          {currentTask.task_type === "theory" && (
            <TheoryQuestion
              task={currentTask}
              answer={answers[taskId] || ""}
              setAnswer={(v) => setAnswers((p) => ({ ...p, [taskId]: v }))}
              submitted={isSubmitted}
            />
          )}

          {currentTask.task_type === "debug" && (
            <DebugQuestion
              task={currentTask}
              answer={answers[taskId] || currentTask.content?.buggy_code || ""}
              setAnswer={(v) => setAnswers((p) => ({ ...p, [taskId]: v }))}
              submitted={isSubmitted}
              hintsUsed={hints[taskId] || 0}
              setHintsUsed={(n) => setHints((p) => ({ ...p, [taskId]: n }))}
              onAutoScore={(s) => setAutoScores((p) => ({ ...p, [taskId]: s }))}
            />
          )}

          {currentTask.task_type === "coding" && (
            <CodingQuestion
              task={currentTask}
              answer={answers[taskId] || currentTask.content?.starter_code || ""}
              setAnswer={(v) => setAnswers((p) => ({ ...p, [taskId]: v }))}
              submitted={isSubmitted}
              onAutoScore={(s) => setAutoScores((p) => ({ ...p, [taskId]: s }))}
            />
          )}

          {/* Inline result after submit */}
          {isSubmitted && <InlineResult result={results[taskId]} />}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {!isSubmitted && (
              <button
                onClick={submitOne}
                disabled={!canSubmitOne()}
                className="flex-1 btn-primary py-3 disabled:opacity-40"
              >
                Submit Answer
              </button>
            )}

            {isSubmitted && !isLastQ && (
              <button
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="flex-1 flex items-center justify-center gap-2 btn-primary py-3"
              >
                Next Question <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* ── FIX 1: Show Finish button when ALL questions are done ── */}
            {allSubmitted && (
              <button
                onClick={submitAll}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Trophy className="w-4 h-4" /> Finish Test</>}
              </button>
            )}
          </div>

          {/* Hint reminder for debug/coding */}
          {!isSubmitted &&
           (currentTask.task_type === "debug" || currentTask.task_type === "coding") &&
           autoScores[taskId] === undefined && (
            <p className="text-xs text-dark-600 text-center">
              Click "Check My Fix" / "Check My Solution" above before submitting
            </p>
          )}

          {/* Dot navigation */}
          <div className="space-y-2 pt-2">
            {[
              { label: "MCQ",    list: mcqTasks,    color: "bg-blue-500",   pending: "bg-dark-800 border border-blue-500/20"   },
              { label: "Debug",  list: debugTasks,  color: "bg-orange-500", pending: "bg-dark-800 border border-orange-500/20" },
              { label: "Coding", list: codingTasks, color: "bg-purple-500", pending: "bg-dark-800 border border-purple-500/20" },
            ].filter(g => g.list.length > 0).map(g => (
              <div key={g.label} className="flex items-center gap-2">
                <span className="text-xs text-dark-600 w-12 shrink-0">{g.label}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {g.list.map((t) => {
                    const tid    = t._id || t.id;
                    const i      = tasks.indexOf(t);
                    const isDone = submitted[tid];
                    const isCurr = i === currentIdx;
                    return (
                      <button
                        key={tid}
                        onClick={() => setCurrentIdx(i)}
                        className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                          isCurr ? `${g.color} text-white scale-110` :
                          isDone  ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/40" :
                                    g.pending + " text-dark-500"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}