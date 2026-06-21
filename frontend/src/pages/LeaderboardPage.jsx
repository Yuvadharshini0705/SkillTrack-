import { useState, useEffect } from "react";
import api from "../utils/api";
import Sidebar from "../components/shared/Sidebar";
import { Trophy, Zap, Flame, Loader2 } from "lucide-react";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/student/leaderboard")
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false));
  }, []);

  const getRankStyle = (rank) => {
    if (rank === 1) return { bg: "bg-yellow-500/10 border-yellow-500/30",     text: "text-yellow-400", icon: "🥇" };
    if (rank === 2) return { bg: "bg-slate-400/10 border-slate-400/30",       text: "text-slate-400",  icon: "🥈" };
    if (rank === 3) return { bg: "bg-orange-700/10 border-orange-700/30",     text: "text-orange-600", icon: "🥉" };
    return             { bg: "glass border-dark-700/30",                      text: "text-dark-400",   icon: null  };
  };

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-3">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-dark-300">Live Rankings</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-white">Leaderboard</h1>
            <p className="text-dark-400 text-sm mt-1">Top students ranked by XP earned</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => {
                const rs = getRankStyle(e.rank);
                return (
                  <div
                    key={e.rank}
                    className={`${rs.bg} ${e.is_me ? "ring-2 ring-primary-500/50" : ""} rounded-2xl border p-4 flex items-center gap-4 transition-all`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0 ${rs.bg} border`}>
                      {rs.icon || <span className={`${rs.text} text-sm`}>{e.rank}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500/30 to-neon-purple/30 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {e.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark-100 truncate">
                          {e.name} {e.is_me && <span className="text-xs text-primary-400">(You)</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-dark-500">Lv.{e.level}</span>
                          {e.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-orange-400">
                              <Flame className="w-3 h-3" />{e.streak}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className={`font-display font-bold text-base ${rs.text}`}>{e.xp.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}