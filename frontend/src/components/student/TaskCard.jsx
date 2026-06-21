import { useNavigate } from "react-router-dom";
import { Clock, Zap, Code2, Bug, FileQuestion, BookText, AlertTriangle, CheckCircle2 } from "lucide-react";

const TYPE_CONFIG = {
  mcq: { icon: FileQuestion, label: "MCQ", cls: "type-mcq" },
  debug: { icon: Bug, label: "Debug", cls: "type-debug" },
  coding: { icon: Code2, label: "Coding", cls: "type-coding" },
  theory: { icon: BookText, label: "Theory", cls: "type-theory" },
};

const DIFF_CONFIG = {
  beginner: "diff-beginner",
  intermediate: "diff-intermediate",
  advanced: "diff-advanced",
  expert: "diff-expert",
};

export default function TaskCard({ assignment }) {
  const navigate = useNavigate();
  const task = assignment?.task;
  if (!task) return null;

  const typeConf = TYPE_CONFIG[task.task_type] || TYPE_CONFIG.mcq;
  const TypeIcon = typeConf.icon;
  const isDone = assignment.status === "completed";
  const isFailed = assignment.status === "failed";
  const isRecovery = assignment.is_recovery;

  return (
    <div
      onClick={() => !isDone && navigate(`/task/${assignment._id || assignment.id}`)}
      className={`task-card p-5 ${isDone ? "opacity-60 cursor-default" : ""} ${isRecovery ? "border-orange-500/30" : ""}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${isRecovery ? "bg-orange-500/15" : "bg-dark-700/80"}`}>
          {isRecovery
            ? <AlertTriangle className="w-5 h-5 text-orange-400" />
            : <TypeIcon className={`w-5 h-5 ${typeConf.cls.replace("type-", "text-")}`} />
          }
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isRecovery && <span className="badge bg-orange-500/15 text-orange-400 border border-orange-500/25">Recovery</span>}
          <span className={`badge ${typeConf.cls}`}>{typeConf.label}</span>
          <span className={`badge ${DIFF_CONFIG[task.difficulty] || "diff-beginner"}`}>{task.difficulty}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-dark-100 text-sm leading-snug line-clamp-2 mb-3">{task.title}</h3>

      {/* Topic */}
      {task.topic && (
        <p className="text-xs text-dark-500 mb-3 truncate">{task.topic}{task.subtopic ? ` · ${task.subtopic}` : ""}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-dark-700/50">
        <div className="flex items-center gap-3 text-xs text-dark-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {Math.round(task.time_limit / 60)}m
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            {task.xp_reward} XP
          </span>
        </div>
        {isDone ? (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Done
          </div>
        ) : (
          <span className="text-xs text-primary-400 font-medium">Start →</span>
        )}
      </div>
    </div>
  );
}
