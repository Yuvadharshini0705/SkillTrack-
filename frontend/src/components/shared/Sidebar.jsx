import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import ThemeToggle from "./ThemeToggle";
import {
  LayoutDashboard, BarChart2, Trophy,
  Bell, User, LogOut, Zap
} from "lucide-react";

const NAV_MAIN = [
  { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard",    exact: true },
  { to: "/analytics",   icon: BarChart2,       label: "Analytics"               },
  { to: "/leaderboard", icon: Trophy,          label: "Leaderboard"             },
];

const NAV_PERSONAL = [
  { to: "/notifications", icon: Bell, label: "Notifications", badge: 3 },
  { to: "/profile",       icon: User, label: "Profile"                 },
];

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate("/login"); };

  const initial = user?.full_name?.[0]?.toUpperCase() || "S";

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .sidebar-shell {
          width: 64x;
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 1024px) {
          .sidebar-shell { width: 240px; }
        }

        .sidebar-inner {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(160deg, #1a1830 0%, #12101e 60%, #0e0d18 100%);
          border-right: 1px solid rgba(139,120,255,0.14);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset,
                      4px 0 32px rgba(0,0,0,0.5),
                      0 0 60px rgba(99,80,210,0.10);
          position: relative;
          overflow: hidden;
        }

        .sidebar-inner::before {
          content: '';
          position: absolute;
          top: -60px; left: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(110,90,220,0.22) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .sidebar-inner::after {
          content: '';
          position: absolute;
          bottom: -40px; right: -40px;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(180,100,255,0.10) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        .sidebar-inner > * { position: relative; z-index: 1; }

        /* Logo */
        .sb-logo {
          padding: 22px 14px 18px;
          display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .sb-logo-icon {
          width: 38px; height: 38px; border-radius: 12px;
          background: linear-gradient(135deg, #7c5cfc 0%, #b77dff 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(124,92,252,0.45), 0 0 0 1px rgba(255,255,255,0.10) inset;
          flex-shrink: 0;
          animation: sb-pulse 4s ease-in-out infinite;
        }
        @keyframes sb-pulse {
          0%,100% { box-shadow: 0 4px 16px rgba(124,92,252,0.45), 0 0 0 1px rgba(255,255,255,0.10) inset; }
          50%      { box-shadow: 0 4px 24px rgba(124,92,252,0.70), 0 0 0 1px rgba(255,255,255,0.16) inset; }
        }
        .sb-brand {
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px;
          color: #fff; letter-spacing: -0.3px; line-height: 1;
        }
        .sb-role {
          font-size: 10.5px; font-weight: 500; margin-top: 3px;
          background: linear-gradient(90deg, #9b78ff, #e09fff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          letter-spacing: 0.5px; text-transform: uppercase;
        }

        /* Section labels */
        .sb-section-label {
          font-size: 9.5px; font-weight: 600; color: rgba(255,255,255,0.22);
          letter-spacing: 1.2px; text-transform: uppercase;
          padding: 10px 12px 3px;
        }

        /* Nav link */
        .sb-link {
          display: flex; align-items: center; gap: 12px;
          padding: 9px 10px;
          border-radius: 12px;
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          position: relative;
          overflow: hidden;
          margin: 1px 0;
        }
        .sb-link::before {
          content: '';
          position: absolute; inset: 0;
          opacity: 0; transition: opacity 0.22s ease;
          background: linear-gradient(135deg, rgba(124,92,252,0.10) 0%, rgba(183,125,255,0.04) 100%);
        }
        .sb-link:hover::before { opacity: 1; }
        .sb-link:hover {
          border-color: rgba(139,120,255,0.14);
          transform: translateX(2px);
        }
        .sb-link.active {
          background: linear-gradient(135deg, rgba(124,92,252,0.20) 0%, rgba(183,125,255,0.09) 100%);
          border-color: rgba(139,120,255,0.28);
          box-shadow: 0 0 0 1px rgba(124,92,252,0.10) inset, 0 4px 16px rgba(124,92,252,0.10);
        }

        .sb-icon-wrap {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(255,255,255,0.04);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: rgba(255,255,255,0.38);
          transition: all 0.22s;
        }
        .sb-link:hover .sb-icon-wrap { color: #a78bfa; background: rgba(124,92,252,0.12); }
        .sb-link.active .sb-icon-wrap { color: #c4b5fd; background: rgba(124,92,252,0.20); }

        .sb-link-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px; color: rgba(255,255,255,0.45);
          transition: color 0.22s; flex: 1;
          white-space: nowrap; overflow: hidden;
        }
        .sb-link:hover .sb-link-label { color: rgba(255,255,255,0.85); }
        .sb-link.active .sb-link-label { color: #fff; font-weight: 500; }

        .sb-badge {
          font-size: 10px; font-weight: 600; padding: 2px 7px;
          border-radius: 20px; flex-shrink: 0;
          background: rgba(183,125,255,0.16);
          color: #c4b5fd;
          border: 1px solid rgba(183,125,255,0.24);
        }

        .sb-active-dot {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          width: 5px; height: 5px; border-radius: 50%;
          background: #9b78ff; box-shadow: 0 0 6px #9b78ff;
          opacity: 0; transition: opacity 0.22s;
        }
        .sb-link.active .sb-active-dot { opacity: 1; }

        .sb-divider {
          height: 1px; background: rgba(255,255,255,0.05);
          margin: 6px 10px;
        }

        /* Theme row */
        .sb-theme-row {
          padding: 10px 16px;
          display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .sb-theme-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; color: rgba(255,255,255,0.28); font-weight: 400;
        }

        /* User footer */
        .sb-footer {
          padding: 12px 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; flex-direction: column; gap: 10px;
          flex-shrink: 0;
        }
        .sb-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(124,92,252,0.50) 0%, rgba(183,125,255,0.38) 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px;
          color: #e0d0ff;
          border: 1px solid rgba(183,125,255,0.28);
          flex-shrink: 0;
        }
        .sb-uname {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.9);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sb-urole {
          font-size: 11px; margin-top: 1px; font-weight: 500;
          background: linear-gradient(90deg, #9b78ff, #d880ff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .sb-logout {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 11px;
          background: rgba(248,113,113,0.07);
          border: 1px solid rgba(248,113,113,0.16);
          cursor: pointer; width: 100%;
          transition: all 0.20s;
          color: #f87171;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 400;
        }
        .sb-logout:hover {
          background: rgba(248,113,113,0.14);
          border-color: rgba(248,113,113,0.30);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="sidebar-shell">
        <div className="sidebar-inner">

          {/* ── Logo ── */}
          <div className="sb-logo">
            <div className="sb-logo-icon">
              <Zap size={18} color="white" strokeWidth={2.2} />
            </div>
            <div className="hidden lg:block" style={{ overflow: "hidden" }}>
              <div className="sb-brand">SkillTrack</div>
              <div className="sb-role">Student Portal</div>
            </div>
          </div>

          {/* ── Nav ── */}
          <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column" }}>

            <div className="sb-section-label hidden lg:block">Main</div>

            {NAV_MAIN.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to} to={to} end={exact}
                className={({ isActive }) => `sb-link${isActive ? " active" : ""}`}
              >
                <div className="sb-icon-wrap">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <span className="sb-link-label hidden lg:block">{label}</span>
                <div className="sb-active-dot" />
              </NavLink>
            ))}

            <div className="sb-divider" />
            <div className="sb-section-label hidden lg:block">Personal</div>

            {NAV_PERSONAL.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to} to={to}
                className={({ isActive }) => `sb-link${isActive ? " active" : ""}`}
              >
                <div className="sb-icon-wrap">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <span className="sb-link-label hidden lg:block">{label}</span>
                {badge && <span className="sb-badge hidden lg:block">{badge}</span>}
                <div className="sb-active-dot" />
              </NavLink>
            ))}

          </nav>

          {/* ── Theme ── */}
          <div className="sb-theme-row">
            <span className="sb-theme-label hidden lg:block">Theme</span>
            <ThemeToggle variant="pill" />
          </div>

          {/* ── User + Logout ── */}
          <div className="sb-footer">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="sb-avatar">{initial}</div>
              <div className="hidden lg:block" style={{ minWidth: 0 }}>
                <div className="sb-uname">{user?.full_name || "Student"}</div>
                <div className="sb-urole">Student</div>
              </div>
            </div>
            <button className="sb-logout" onClick={handleLogout}>
              <LogOut size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span className="hidden lg:block">Logout</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}