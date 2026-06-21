// components/DebugQuestion.jsx
import { useState } from "react";
import { checkDebug } from "../utils/codeChecker";
import {
  Code2, CheckCircle2, XCircle, Lightbulb, Search,
  AlertTriangle, ChevronRight, Zap,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const color =
    score >= 80 ? "#34d399" :
    score >= 50 ? "#fbbf24" :
                  "#f87171";
  return (
    <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-dark-800">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  );
}

function IssueList({ issues }) {
  if (!issues || issues.length === 0) return null;
  return (
    <div className="mt-3 bg-dark-800/70 rounded-xl p-3 border border-dark-700/50">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500 mb-2">
        What to improve
      </p>
      <ul className="space-y-1.5">
        {issues.slice(0, 3).map((issue, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-dark-400">
            <ChevronRight className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
            {issue}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DebugQuestion({
  task,
  answer,
  setAnswer,
  submitted,
  hintsUsed,
  setHintsUsed,
  onAutoScore,
}) {
  const c = task.content || {};
  const hints = c.hints || [];
  const structureChecks = c.structure_checks || [];   // ← new task field
  const [showHints, setShowHints] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const handleCheck = () => {
    const result = checkDebug(answer, task.solution || "", structureChecks);
    setCheckResult(result);
    onAutoScore(result.score);
  };

  const resultStyle = checkResult?.passed
    ? { wrap: "border-emerald-500/25 bg-emerald-500/5", text: "text-emerald-300", icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> }
    : checkResult?.score >= 50
    ? { wrap: "border-yellow-500/25 bg-yellow-500/5",  text: "text-yellow-300",  icon: <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" /> }
    : { wrap: "border-rose-500/25 bg-rose-500/5",      text: "text-rose-300",    icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" /> };

  return (
    <div className="space-y-4">

      {/* ── Problem card ── */}
      <div className="glass rounded-2xl p-5 border border-dark-700/60">
        {/* Badge row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20">
            🐛 Debug Challenge
          </span>
          {c.bug_count && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-3 h-3" />
              {c.bug_count} bug{c.bug_count > 1 ? "s" : ""} to fix
            </span>
          )}
        </div>

        <p className="text-dark-100 leading-relaxed text-[15px]">
          {task.description || "Find and fix the bug in this code"}
        </p>

        {c.expected_output && (
          <p className="flex items-center gap-2 text-xs text-dark-500 mt-3">
            Expected output:
            <code className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {c.expected_output}
            </code>
          </p>
        )}
      </div>

      {/* ── Code editor ── */}
      <div className="rounded-2xl overflow-hidden border border-dark-700/70 shadow-lg">
        {/* Editor top bar */}
        <div className="flex items-center gap-2.5 bg-dark-800 px-4 py-2.5 border-b border-dark-700/70">
          {/* macOS window dots */}
          <span className="w-3 h-3 rounded-full bg-rose-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <Code2 className="w-3.5 h-3.5 text-orange-400 ml-2" />
          <span className="font-mono text-[11px] text-dark-400">
            {c.language || "javascript"}
          </span>
          {c.bug_count && (
            <span className="ml-auto font-mono text-[11px] font-semibold text-rose-400">
              {c.bug_count} bug{c.bug_count > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Textarea */}
        <textarea
          disabled={submitted}
          value={answer || c.buggy_code || ""}
          onChange={(e) => { setAnswer(e.target.value); setCheckResult(null); }}
          className="w-full bg-[#0d0d13] text-emerald-400 font-mono text-[13px] leading-7 p-5 resize-none focus:outline-none min-h-52 disabled:opacity-60 caret-violet-400"
          rows={10}
          spellCheck={false}
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        />
      </div>

      {/* ── Hint button ── */}
      {!submitted && hints.length > 0 && (
        <button
          onClick={() => {
            setShowHints(true);
            setHintsUsed(Math.min(hintsUsed + 1, hints.length));
          }}
          className="flex items-center gap-2 text-[12px] font-semibold text-yellow-400 bg-yellow-500/8 hover:bg-yellow-500/15 border border-yellow-500/20 px-3.5 py-2 rounded-full transition-all"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {showHints
            ? `${hintsUsed} hint used · -${hintsUsed * 2} XP`
            : "Use a hint"}
        </button>
      )}

      {/* ── Hint boxes ── */}
      {showHints &&
        hints.slice(0, hintsUsed).map((h, i) => (
          <div
            key={i}
            className="glass rounded-xl px-4 py-3 border border-yellow-500/15 bg-yellow-500/5"
          >
            <p className="text-xs text-yellow-300/90 leading-relaxed">
              <span className="font-semibold text-yellow-400">Hint {i + 1}:</span> {h}
            </p>
          </div>
        ))}

      {/* ── Check button ── */}
      {!submitted && (
        <button
          onClick={handleCheck}
          disabled={!answer?.trim()}
          className="flex items-center gap-2 text-[13px] font-semibold bg-orange-500/10 hover:bg-orange-500/18 border border-orange-500/25 text-orange-400 px-5 py-2.5 rounded-xl transition-all disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" />
          Check My Fix
        </button>
      )}

      {/* ── Check result ── */}
      {checkResult && !submitted && (
        <div
          className={`rounded-xl border p-4 transition-all ${resultStyle.wrap}`}
          style={{ animation: "fadeUp .25s ease" }}
        >
          <div className="flex items-start gap-3">
            {resultStyle.icon}
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold ${resultStyle.text}`}>
                {checkResult.label}
              </p>
              <p className="text-[11px] text-dark-500 mt-0.5">
                Structural match: {checkResult.score}%
              </p>
              <ScoreBar score={checkResult.score} />
            </div>
            {checkResult.score > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 shrink-0">
                <Zap className="w-3 h-3" />{checkResult.score}%
              </span>
            )}
          </div>
          <IssueList issues={checkResult.issues} />
        </div>
      )}

      {/* ── Solution reveal (after submit) ── */}
      {submitted && (
        <div className="glass rounded-xl p-4 border border-orange-500/20 bg-orange-500/5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-400 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fixed code
          </p>
          <pre
            className="text-[13px] text-emerald-300 whitespace-pre-wrap overflow-x-auto leading-7"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {task.solution}
          </pre>
        </div>
      )}
    </div>
  );
}