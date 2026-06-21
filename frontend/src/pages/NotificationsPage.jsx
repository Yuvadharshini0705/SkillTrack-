import { useState, useEffect } from "react";
import api from "../utils/api";
import Sidebar from "../components/shared/Sidebar";
import {
  Bell, CheckCheck, Trash2, Loader2,
  Info, CheckCircle2, AlertTriangle, Zap
} from "lucide-react";

const TYPE_CONFIG = {
  success: { icon: CheckCircle2,  bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon_color: "text-emerald-400" },
  info:    { icon: Info,          bg: "bg-blue-500/10",    border: "border-blue-500/20",    icon_color: "text-blue-400"    },
  warning: { icon: AlertTriangle, bg: "bg-orange-500/10",  border: "border-orange-500/20",  icon_color: "text-orange-400"  },
  decay:   { icon: AlertTriangle, bg: "bg-rose-500/10",    border: "border-rose-500/20",    icon_color: "text-rose-400"    },
  xp:      { icon: Zap,           bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  icon_color: "text-yellow-400"  },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [unread,        setUnread]        = useState(0);

  const load = () => {
    setLoading(true);
    api.get("/student/notifications?limit=50")
      .then(r => {
        setNotifications(r.data.notifications || r.data);
        // Count unread from the list itself as fallback
        const unreadCount = r.data.unread ?? (r.data.notifications || r.data).filter(n => !n.is_read).length;
        setUnread(unreadCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Mark as read after a short delay so badge is visible briefly
    const timer = setTimeout(() => {
      api.post("/student/notifications/read", {}).catch(() => {});
      setUnread(0);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const markAllRead = async () => {
    await api.post("/student/notifications/read", {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const deleteNotif = async (id) => {
    try {
      await api.delete(`/student/notifications/${id}`);
      setNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
    } catch {}
  };

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Pass unread count to Sidebar so the bell badge shows in the nav */}
      <Sidebar notifCount={unread} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">

              {/* Bell icon with red unread badge */}
              <div className="relative">
                <Bell className="w-6 h-6 text-primary-400" />
                {unread > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-lg shadow-rose-500/40">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>

              <div>
                <h1 className="font-display text-2xl font-bold text-white">Notifications</h1>
                <p className="text-dark-400 text-sm">
                  {unread > 0 ? `${unread} unread` : "All caught up!"}
                </p>
              </div>
            </div>

            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="btn-secondary flex items-center gap-2 text-sm py-2"
              >
                <CheckCheck className="w-4 h-4" /> Mark all read
              </button>
            )}
          </div>

          {/* ── Body ── */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="card text-center py-16">
              <Bell className="w-12 h-12 text-dark-700 mx-auto mb-3" />
              <p className="text-dark-400 font-medium">No notifications yet</p>
              <p className="text-dark-600 text-sm mt-1">Complete tasks to start receiving updates</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const id  = n._id || n.id;
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={id}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                      n.is_read ? "glass border-dark-700/30" : `${cfg.bg} ${cfg.border}`
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${cfg.icon_color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${n.is_read ? "text-dark-300" : "text-white"}`}>
                          {n.title}
                        </p>
                        <span className="text-xs text-dark-600 shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      {/* ✅ Message is always visible — brighter + larger text */}
                      <p className="text-sm text-dark-300 mt-1 leading-relaxed">{n.message}</p>
                    </div>

                    <button
                      onClick={() => deleteNotif(id)}
                      className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-600 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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