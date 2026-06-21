// frontend/src/components/admin/AdminSidebar.jsx
// Theme: Midnight Violet — dual light/dark, Bricolage Grotesque + Manrope typography

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore"; // adjust to your theme store
import {
  LayoutDashboard, ListTodo, Users, BookOpen,
  Upload, BarChart2, LogOut, Shield, TrendingDown,
  ChevronLeft,
} from "lucide-react";

const NAV_MANAGEMENT = [
  { to: "/admin",          icon: LayoutDashboard, label: "Overview",    exact: true },
  { to: "/admin/tasks",    icon: ListTodo,        label: "Tasks"                    },
  { to: "/admin/students", icon: Users,           label: "Students"                 },
  { to: "/admin/courses",  icon: BookOpen,        label: "Courses"                  },
];

const NAV_TOOLS = [
  { to: "/admin/upload",    icon: Upload,       label: "Bulk Upload" },
  { to: "/admin/analytics", icon: BarChart2,    label: "Analytics"   },
  { to: "/admin/recovery",  icon: TrendingDown, label: "Recovery"    },
];

export default function AdminSidebar() {
  const { logout, user } = useAuthStore();
  const { theme, setTheme } = useThemeStore(); // "light" | "dark"
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };
  const initial = user?.full_name?.[0]?.toUpperCase() || "A";

  const fade = {
    transition: "opacity 0.22s ease, max-width 0.32s cubic-bezier(0.4,0,0.2,1)",
    opacity: collapsed ? 0 : 1,
    maxWidth: collapsed ? 0 : 200,
    overflow: "hidden",
    pointerEvents: collapsed ? "none" : "auto",
    flexShrink: 0,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap');

        @keyframes adm-slide-in {
          from { opacity:0; transform:translateX(-18px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes adm-fade-down {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes adm-fade-up {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes adm-orb1 {
          0%,100% { transform:translate(0,0) scale(1); }
          50%     { transform:translate(18px,14px) scale(1.08); }
        }
        @keyframes adm-orb2 {
          0%,100% { transform:translate(0,0) scale(1); }
          50%     { transform:translate(-12px,-16px) scale(1.06); }
        }
        @keyframes adm-pulse-dot {
          0%,100% { opacity:1; transform:translateY(-50%) scale(1); }
          50%     { opacity:0.5; transform:translateY(-50%) scale(0.65); }
        }

        /* ── Shell ── */
        .adm-shell {
          animation: adm-slide-in 0.38s cubic-bezier(0.4,0,0.2,1) both;
          height: 100vh;
          position: relative;
          flex-shrink: 0;
        }

        /* ── Inner — always dark sidebar ── */
        .adm-inner {
          width: 120%; height: 100vh;
          display: flex; flex-direction: column;
          background: linear-gradient(160deg, #1a1040 0%, #130d2e 55%, #0d0820 100%);
          border-right: 1px solid rgba(139,92,246,0.18);
          box-shadow: 4px 0 40px rgba(0,0,0,0.55), inset 1px 0 0 rgba(255,255,255,0.02);
          position: relative; overflow: hidden;
        }
        .adm-inner::before {
          content: ''; position: absolute; top: -80px; left: -60px;
          width: 220px; height: 220px;
          background: radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
          animation: adm-orb1 12s ease-in-out infinite;
        }
        .adm-inner::after {
          content: ''; position: absolute; bottom: -60px; right: -50px;
          width: 180px; height: 180px;
          background: radial-gradient(ellipse, rgba(99,59,220,0.12) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
          animation: adm-orb2 15s ease-in-out infinite reverse;
        }
        .adm-inner > * { position: relative; z-index: 1; }

        /* ── Collapse toggle ── */
        .adm-toggle {
          position: absolute; right: -13px; top: 24px; z-index: 20;
          width: 26px; height: 26px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          border: 2px solid #1a1040;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 16px rgba(124,58,237,0.55);
          transition: box-shadow 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .adm-toggle:hover {
          box-shadow: 0 4px 24px rgba(124,58,237,0.80);
          transform: scale(1.12);
        }

        /* ── Logo ── */
        .adm-logo {
          padding: 18px 14px 14px;
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1px solid rgba(139,92,246,0.10);
          flex-shrink: 0; overflow: hidden;
          animation: adm-fade-down 0.4s ease both;
        }
        .adm-logo-icon {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 18px rgba(124,58,237,0.50);
          position: relative; overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
        }
        .adm-logo-icon::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%;
          background: rgba(255,255,255,0.13); border-radius: 10px 10px 0 0;
        }
        .adm-logo-icon:hover {
          transform: rotate(-8deg) scale(1.1);
          box-shadow: 0 6px 26px rgba(124,58,237,0.70);
        }

        /* ── Access strip ── */
        .adm-access {
          margin: 10px 10px 0;
          padding: 8px 10px; border-radius: 10px;
          background: rgba(124,58,237,0.10);
          border: 1px solid rgba(139,92,246,0.22);
          display: flex; align-items: center; gap: 9px;
          flex-shrink: 0; overflow: hidden;
          animation: adm-fade-up 0.38s ease both 0.1s;
          position: relative;
        }
        .adm-access::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, #7c3aed, #a855f7);
          border-radius: 3px 0 0 3px;
        }
        .adm-access-icon {
          width: 22px; height: 22px; border-radius: 6px;
          background: rgba(124,58,237,0.22);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* ── Section label ── */
        .adm-sec {
          font-family: 'Manrope', sans-serif;
          font-size: 8.5px; font-weight: 800;
          color: rgba(167,139,250,0.30); letter-spacing: 1.8px;
          text-transform: uppercase; padding: 10px 4px 4px;
          white-space: nowrap; overflow: hidden;
        }

        /* ── Nav ── */
        .adm-nav {
          flex: 1; padding: 4px 8px;
          display: flex; flex-direction: column; gap: 1px;
          overflow-y: auto; overflow-x: hidden;
        }
        .adm-nav::-webkit-scrollbar { width: 3px; }
        .adm-nav::-webkit-scrollbar-thumb {
          background: rgba(139,92,246,0.18); border-radius: 3px;
        }

        /* ── Nav link ── */
        .adm-link {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 8px; border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer; text-decoration: none;
          transition: all 0.2s ease;
          position: relative; margin: 1px 0;
        }
        .adm-link:hover {
          background: rgba(124,58,237,0.09);
          border-color: rgba(139,92,246,0.14);
          transform: translateX(2px);
        }
        .adm-link:active { transform: translateX(1px) scale(0.98); }
        .adm-link.active {
          background: linear-gradient(135deg, rgba(124,58,237,0.22), rgba(139,92,246,0.08));
          border-color: rgba(139,92,246,0.30);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        /* ── Nav icon ── */
        .adm-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: rgba(167,139,250,0.35);
          transition: color 0.22s ease, background 0.22s ease,
                      transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .adm-link:hover .adm-icon {
          color: #a78bfa; background: rgba(124,58,237,0.18);
          transform: scale(1.1) rotate(-3deg);
        }
        .adm-link.active .adm-icon { color: #c4b5fd; background: rgba(124,58,237,0.26); }

        /* ── Nav label ── */
        .adm-lbl {
          font-family: 'Manrope', sans-serif;
          font-size: 12.5px; font-weight: 500;
          color: rgba(255,255,255,0.35); transition: color 0.2s ease;
          flex: 1; white-space: nowrap; overflow: hidden;
        }
        .adm-link:hover .adm-lbl { color: rgba(255,255,255,0.82); }
        .adm-link.active .adm-lbl { color: #e9d5ff; font-weight: 700; }

        /* ── Active dot ── */
        .adm-dot {
          position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%);
          width: 5px; height: 5px; border-radius: 50%;
          background: #a78bfa; box-shadow: 0 0 8px rgba(167,139,250,0.60);
          opacity: 0; transition: opacity 0.22s ease;
          animation: adm-pulse-dot 2.2s ease-in-out infinite;
        }
        .adm-link.active .adm-dot { opacity: 1; }

        /* ── Collapsed tooltip ── */
        .adm-tip {
          position: absolute; left: 46px; top: 50%; transform: translateY(-50%);
          background: #1a1035; border: 1px solid rgba(139,92,246,0.28);
          color: #e9d5ff; font-family: 'Manrope', sans-serif;
          font-size: 11.5px; font-weight: 600;
          padding: 5px 10px; border-radius: 8px; white-space: nowrap;
          pointer-events: none; opacity: 0;
          transition: opacity 0.15s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.50); z-index: 100;
        }
        .adm-link:hover .adm-tip { opacity: 1; }

        /* ── Divider ── */
        .adm-divider {
          height: 1px; background: rgba(139,92,246,0.08); margin: 4px 2px;
        }

        /* ── Theme row ── */
        .adm-theme {
          padding: 8px 12px;
          display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid rgba(139,92,246,0.08);
          flex-shrink: 0; overflow: hidden;
        }
        .adm-theme-lbl {
          font-family: 'Manrope', sans-serif;
          font-size: 10.5px; font-weight: 600;
          color: rgba(167,139,250,0.28);
        }
        .adm-theme-pill {
          display: flex; align-items: center; gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(139,92,246,0.20);
          border-radius: 20px; padding: 3px; cursor: pointer;
        }
        .adm-theme-btn {
          padding: 4px 9px; border-radius: 16px;
          font-family: 'Manrope', sans-serif;
          font-size: 10.5px; font-weight: 700;
          border: none; background: transparent; cursor: pointer;
          transition: all 0.22s ease; color: rgba(167,139,250,0.45);
        }
        .adm-theme-btn.active {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: #fff; box-shadow: 0 2px 10px rgba(124,58,237,0.40);
        }

        /* ── Footer ── */
        .adm-footer {
          padding: 10px 10px 14px;
          border-top: 1px solid rgba(139,92,246,0.08);
          display: flex; flex-direction: column; gap: 8px;
          flex-shrink: 0; overflow: hidden;
          animation: adm-fade-up 0.4s ease both 0.3s;
        }

        /* ── Avatar ── */
        .adm-avatar {
          width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(124,58,237,0.50), rgba(139,92,246,0.30));
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
          font-size: 13px; color: #c4b5fd;
          border: 1px solid rgba(139,92,246,0.28);
          transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease;
        }
        .adm-avatar:hover {
          transform: scale(1.1) rotate(-5deg);
          box-shadow: 0 4px 18px rgba(124,58,237,0.40);
        }

        /* ── Logout ── */
        .adm-logout {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 9px;
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.14);
          cursor: pointer; width: 100%; color: #f87171;
          font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
          transition: all 0.2s ease; overflow: hidden;
        }
        .adm-logout:hover {
          background: rgba(239,68,68,0.14);
          border-color: rgba(239,68,68,0.28);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(239,68,68,0.12);
        }
        .adm-logout:active { transform: scale(0.97); }
      `}</style>

      <div
        className="adm-shell"
        style={{ width: collapsed ? 62 : 230, transition: "width 0.32s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div className="adm-inner">

          {/* Collapse toggle */}
          <button className="adm-toggle" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
            <ChevronLeft
              size={11} color="white" strokeWidth={2.5}
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </button>

          {/* Logo */}
          <div className="adm-logo">
            <div className="adm-logo-icon">
              <Shield size={16} color="white" strokeWidth={2} />
            </div>
            <div style={fade}>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: -0.4, lineHeight: 1,
              }}>
                SkillTrack
              </div>
              <div style={{
                fontSize: 8.5, fontWeight: 700, marginTop: 3,
                background: "linear-gradient(90deg,#a78bfa,#c4b5fd)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                letterSpacing: "1.4px", textTransform: "uppercase",
              }}>
                Admin Panel
              </div>
            </div>
          </div>

          {/* Access strip */}
          <div className="adm-access">
            <div className="adm-access-icon">
              <Shield size={11} color="#a78bfa" strokeWidth={2.2} />
            </div>
            <div style={fade}>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10.5, fontWeight: 700, color: "#a78bfa", whiteSpace: "nowrap" }}>
                Administrator Access
              </div>
              <div style={{ fontSize: 8.5, color: "rgba(167,139,250,0.45)", whiteSpace: "nowrap", marginTop: 1 }}>
                Full control enabled
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="adm-nav">
            <div className="adm-sec" style={fade}>Management</div>

            {NAV_MANAGEMENT.map(({ to, icon: Icon, label, exact }) => (
              <NavLink key={to} to={to} end={exact}
                className={({ isActive }) => `adm-link${isActive ? " active" : ""}`}
              >
                <div className="adm-icon"><Icon size={14} strokeWidth={2} /></div>
                <span className="adm-lbl" style={fade}>{label}</span>
                <div className="adm-dot" />
                {collapsed && <div className="adm-tip">{label}</div>}
              </NavLink>
            ))}

            <div className="adm-divider" />
            <div className="adm-sec" style={fade}>Tools</div>

            {NAV_TOOLS.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `adm-link${isActive ? " active" : ""}`}
              >
                <div className="adm-icon"><Icon size={14} strokeWidth={2} /></div>
                <span className="adm-lbl" style={fade}>{label}</span>
                <div className="adm-dot" />
                {collapsed && <div className="adm-tip">{label}</div>}
              </NavLink>
            ))}
          </nav>

          {/* Theme toggle */}
          <div className="adm-theme">
            <span className="adm-theme-lbl" style={fade}>Theme</span>
            <div className="adm-theme-pill">
              <button
                className={`adm-theme-btn${theme === "light" ? " active" : ""}`}
                onClick={() => setTheme("light")}
              >
                Light
              </button>
              <button
                className={`adm-theme-btn${theme === "dark" ? " active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="adm-footer">
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div className="adm-avatar">{initial}</div>
              <div style={{ ...fade, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 700,
                  color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {user?.full_name || "Admin"}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700,
                  background: "linear-gradient(90deg,#a78bfa,#c4b5fd)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  marginTop: 1,
                }}>
                  Administrator
                </div>
              </div>
            </div>
            <button className="adm-logout" onClick={handleLogout}>
              <LogOut size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={fade}>Logout</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}