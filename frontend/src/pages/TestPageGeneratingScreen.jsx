// TestPage.jsx — add this near the top of the file, in the status checks section
// Replace your existing "locked" screen with this updated version that handles
// the new "generating" status returned by the backend queue system.

// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS STATE in the TestPage component (near other useState declarations):
//   const [pollingGeneration, setPollingGeneration] = useState(false);
//   const pollGenRef = useRef(null);
//
// ADD THIS useEffect (after your main load useEffect):
//
//   useEffect(() => {
//     return () => {
//       clearInterval(pollGenRef.current);
//     };
//   }, []);
//
// UPDATE your main load useEffect to handle "generating":
//
//   } else if (d.status === "generating") {
//     setDay(d.day);
//     setStatus("generating");
//     setLockedMsg(d.message);
//     // Auto-poll every 8 seconds
//     setPollingGeneration(true);
//     pollGenRef.current = setInterval(async () => {
//       try {
//         const poll = await api.get(`/student/daily-test?course_id=${courseId}`);
//         if (poll.data.status === "ready") {
//           clearInterval(pollGenRef.current);
//           setPollingGeneration(false);
//           setTasks(poll.data.tasks);
//           setDay(poll.data.day);
//           setStatus("ready");
//           const t = {};
//           poll.data.tasks.forEach(task => { t[task._id || task.id] = 0; });
//           setTimers(t);
//           testStartRef.current = new Date();
//           elapsedRef.current = setInterval(() => {
//             setElapsed(Math.floor((Date.now() - testStartRef.current.getTime()) / 1000));
//           }, 1000);
//         }
//       } catch { /* keep polling */ }
//     }, 8000);
//   }
// ─────────────────────────────────────────────────────────────────────────────

// REPLACE your "locked" status JSX block with this (handles both locked + generating):

export function GeneratingScreen({ day, lockedMsg, courseId }) {
  const [countdown, setCountdown] = React.useState(8);
  const [checking,  setChecking]  = React.useState(false);

  React.useEffect(() => {
    const t = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) { setChecking(true); return 8; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center border border-primary-500/20 space-y-5">
        {/* Animated generation indicator */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-primary-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-primary-500/30 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary-500/10 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-bold text-white mb-1">
            Generating Day {day} Questions
          </h2>
          <p className="text-dark-400 text-sm leading-relaxed">{lockedMsg}</p>
        </div>

        {/* Generation steps */}
        <div className="text-left space-y-2 bg-dark-800/60 rounded-xl p-4">
          {[
            { step: "Analyzing curriculum for Day " + day, done: true },
            { step: "Generating MCQ questions (8 questions)",   done: checking },
            { step: "Generating Debug challenges (4 questions)", done: false },
            { step: "Generating Coding tasks (4 questions)",    done: false },
            { step: "Generating Theory questions (4 questions)", done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {s.done
                ? <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </div>
                : <div className="w-4 h-4 rounded-full border border-dark-600 shrink-0 animate-pulse" />
              }
              <span className={s.done ? "text-dark-300" : "text-dark-600"}>{s.step}</span>
            </div>
          ))}
        </div>

        {/* Auto-check countdown */}
        <div className="flex items-center justify-center gap-2 text-sm text-dark-500">
          <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          Auto-checking in {countdown}s...
        </div>

        <p className="text-xs text-dark-600">
          Questions are generated one at a time to ensure quality.
          This usually takes 60–120 seconds.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// In TestPage.jsx, add this check after the "locked" check:
//
//   if (status === "generating") return (
//     <GeneratingScreen day={day} lockedMsg={lockedMsg} courseId={courseId} />
//   );
// ─────────────────────────────────────────────────────────────────────────────