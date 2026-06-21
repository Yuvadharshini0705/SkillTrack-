// frontend/src/components/student/RecoveryPanel.jsx
// =====================================================
// Drop this component into StudentDashboard.jsx
//
// Usage in StudentDashboard.jsx:
//   import RecoveryPanel from "../components/student/RecoveryPanel";
//   // Inside your JSX, after the daily test section:
//   <RecoveryPanel courseId={courseId} />

import { useEffect, useState } from "react";
import api from "../../utils/api";   // adjust path to match your existing api.js

export default function RecoveryPanel({ courseId }) {
  const [status, setStatus]   = useState(null);
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState(null);   // currently open task
  const [answer, setAnswer]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]   = useState(null);

  const load = async () => {
    try {
      const [s, t] = await Promise.all([
        api.get(`/api/recovery/status/${courseId}`),
        api.get(`/api/recovery/tasks/${courseId}`),
      ]);
      setStatus(s.data);
      setTasks(t.data.recovery_tasks || []);
    } catch (e) {
      console.error("Recovery load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (courseId) load(); }, [courseId]);

  // Don't render anything if student is not in recovery
  if (loading) return null;
  if (!status?.in_recovery && tasks.length === 0) return null;

  const handleSubmit = async (assignmentId) => {
    if (!answer.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post(`/api/recovery/tasks/${assignmentId}/submit`, {
        answers:   { answer },
        time_taken: 60,
        course_id:  courseId,
      });
      setResult(res.data);
      setAnswer("");
      // Reload after short delay
      setTimeout(() => { load(); setActive(null); setResult(null); }, 2000);
    } catch (e) {
      console.error("Recovery submit error", e);
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = (s) => {
    if (s >= 50) return "text-yellow-600";
    if (s >= 30) return "text-orange-500";
    return "text-red-600";
  };

  const barWidth = (s) => `${Math.max(s, 3)}%`;

  return (
    <div className={`rounded-2xl border-2 p-5 mb-6 
      ${status?.is_critical
        ? "border-red-400 bg-red-50"
        : "border-orange-300 bg-orange-50"}`}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{status?.is_critical ? "🚨" : "🔄"}</span>
        <div>
          <h2 className={`text-lg font-bold ${status?.is_critical ? "text-red-700" : "text-orange-700"}`}>
            {status?.is_critical ? "Critical Recovery Mode" : "Recovery Mode Active"}
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">{status?.message}</p>
        </div>
        <div className="ml-auto text-right">
          <p className={`text-2xl font-bold ${scoreColor(status?.skill_score)}`}>
            {status?.skill_score?.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">Skill Score</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Current Score</span>
          <span>Target: {status?.threshold}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700
              ${status?.is_critical ? "bg-red-500" : "bg-orange-400"}`}
            style={{ width: barWidth(status?.skill_score) }}
          />
          {/* Threshold marker */}
          <div
            className="relative"
            style={{ marginLeft: `${status?.threshold}%`, marginTop: "-12px" }}
          >
            <div className="w-0.5 h-3 bg-gray-600 absolute" />
          </div>
        </div>
      </div>

      {/* Weak topics */}
      {status?.weak_topics?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Weak Topics:</p>
          <div className="flex flex-wrap gap-2">
            {status.weak_topics.map((t) => (
              <span key={t.topic}
                className="text-xs px-2 py-1 bg-white border border-orange-200 rounded-full text-orange-700">
                {t.topic} ({t.accuracy}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recovery tasks */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Recovery Tasks ({tasks.length} pending)
            </p>
            <span className="text-xs text-gray-500">
              Completed today: {status?.completed_today}
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((assignment) => {
              const task    = assignment.task;
              const isOpen  = active === assignment._id;
              const content = task?.content || {};

              return (
                <div key={assignment._id}
                  className="bg-white rounded-xl border border-orange-200 overflow-hidden">

                  {/* Task header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-orange-50"
                    onClick={() => { setActive(isOpen ? null : assignment._id); setAnswer(""); setResult(null); }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {task?.task_type === "mcq" ? "❓" : task?.task_type === "debug" ? "🐛" : "💻"}
                      </span>
                      <div>
                        <p className="font-medium text-sm text-gray-800">{task?.title}</p>
                        <p className="text-xs text-gray-500">
                          {task?.topic} · {task?.difficulty} · {task?.task_type?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${task?.difficulty === "beginner"
                          ? "bg-green-100 text-green-700"
                          : task?.difficulty === "intermediate"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"}`}>
                        {task?.difficulty}
                      </span>
                      <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Task body — expanded */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-orange-100">

                      {/* Question */}
                      <div className="mt-3 mb-4">
                        <p className="text-sm font-medium text-gray-800 mb-1">Question:</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {content.question || content.problem_statement || task?.title}
                        </p>
                      </div>

                      {/* MCQ options */}
                      {task?.task_type === "mcq" && content.options?.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {content.options.map((opt, i) => {
                            const optText = typeof opt === "string" ? opt : opt.text || "";
                            return (
                              <button
                                key={i}
                                onClick={() => setAnswer(optText)}
                                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all
                                  ${answer === optText
                                    ? "border-orange-500 bg-orange-50 text-orange-700 font-medium"
                                    : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
                              >
                                {optText}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Text answer (debug / coding / theory) */}
                      {task?.task_type !== "mcq" && (
                        <textarea
                          className="w-full border border-gray-300 rounded-xl p-3 text-sm font-mono
                            focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
                          rows={5}
                          placeholder="Write your answer here..."
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                        />
                      )}

                      {/* Result feedback */}
                      {result && (
                        <div className={`rounded-xl p-3 mb-3 text-sm font-medium text-center
                          ${result.is_correct
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"}`}>
                          {result.is_correct ? "✅ " : "❌ "}{result.message}
                          {result.new_skill_score && (
                            <span className="ml-2">New score: {result.new_skill_score}</span>
                          )}
                        </div>
                      )}

                      {/* Submit button */}
                      <button
                        onClick={() => handleSubmit(assignment._id)}
                        disabled={!answer.trim() || submitting}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                          ${answer.trim() && !submitting
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-gray-300 cursor-not-allowed"}`}
                      >
                        {submitting ? "Submitting…" : "Submit Answer"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No tasks but in recovery */}
      {tasks.length === 0 && status?.in_recovery && (
        <div className="text-center py-4 text-sm text-gray-500">
          <p>No recovery tasks assigned yet.</p>
          <p className="text-xs mt-1">Your admin needs to mark some tasks as recovery tasks.</p>
        </div>
      )}
    </div>
  );
}