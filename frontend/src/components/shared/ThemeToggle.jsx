// frontend/src/components/shared/ThemeToggle.jsx
// Enhanced: smooth spring-like animation, icon transition, both variants

import { useThemeStore } from "../../store/themeStore";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ showLabel = false, variant = "icon" }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  // ── Sliding pill variant ────────────────────────────────────────────────────
  if (variant === "pill") {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: 52,
          height: 28,
          borderRadius: 999,
          backgroundColor: isDark ? "rgba(99,102,241,0.18)" : "rgba(251,191,36,0.18)",
          border: isDark ? "1px solid rgba(99,102,241,0.32)" : "1px solid rgba(251,191,36,0.42)",
          cursor: "pointer",
          outline: "none",
          transition: "background-color 0.35s cubic-bezier(0.4,0,0.2,1), border-color 0.35s ease",
          flexShrink: 0,
        }}
      >
        {/* Track icons */}
        <Moon
          style={{
            position: "absolute",
            left: 7,
            width: 12,
            height: 12,
            color: "#818cf8",
            opacity: isDark ? 0.8 : 0.4,
            transition: "opacity 0.3s ease",
          }}
        />
        <Sun
          style={{
            position: "absolute",
            right: 7,
            width: 12,
            height: 12,
            color: "#fbbf24",
            opacity: isDark ? 0.4 : 0.8,
            transition: "opacity 0.3s ease",
          }}
        />

        {/* Thumb */}
        <span
          style={{
            position: "absolute",
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: isDark ? "#818cf8" : "#f59e0b",
            left: isDark ? 3 : "calc(100% - 23px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDark
              ? "0 2px 8px rgba(99,102,241,0.5)"
              : "0 2px 8px rgba(245,158,11,0.5)",
            transition:
              "left 0.32s cubic-bezier(0.34,1.56,0.64,1), background-color 0.32s ease, box-shadow 0.32s ease",
          }}
        >
          {isDark
            ? <Moon style={{ width: 10, height: 10, color: "#fff" }} />
            : <Sun  style={{ width: 10, height: 10, color: "#fff" }} />
          }
        </span>
      </button>
    );
  }

  // ── Default icon button ─────────────────────────────────────────────────────
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: "0.75rem",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        transition: "background-color 0.2s ease",
        outline: "none",
      }}
      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)]"
    >
      <span
        style={{
          display: "block",
          transition: "transform 0.40s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(180deg) scale(0.9)",
        }}
      >
        {isDark
          ? <Sun  className="w-4 h-4 text-yellow-400" />
          : <Moon className="w-4 h-4 text-[var(--accent-primary-light)]" />
        }
      </span>
      {showLabel && (
        <span
          className="hidden lg:block text-sm font-medium"
          style={{
            overflow: "hidden",
            transition: "opacity 0.2s ease",
          }}
        >
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );
}