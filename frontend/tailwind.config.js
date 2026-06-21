/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Clash Display'", "sans-serif"],
        body: ["'Cabinet Grotesk'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        neon: {
          blue: "#00d4ff",
          purple: "#a855f7",
          green: "#00ff88",
          orange: "#ff6b35",
          pink: "#ff3d9a",
        },
        dark: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      backgroundImage: {
        "mesh-1": "radial-gradient(at 40% 20%, #0ea5e910 0px, transparent 50%), radial-gradient(at 80% 0%, #a855f710 0px, transparent 50%), radial-gradient(at 0% 50%, #00ff8808 0px, transparent 50%)",
        "grid-pattern": "linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "progress-bar": "progressBar 1s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(14,165,233,0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(14,165,233,0.8), 0 0 40px rgba(14,165,233,0.3)" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        progressBar: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        },
      },
      boxShadow: {
        "neon-blue": "0 0 15px rgba(0,212,255,0.5), 0 0 30px rgba(0,212,255,0.2)",
        "neon-purple": "0 0 15px rgba(168,85,247,0.5), 0 0 30px rgba(168,85,247,0.2)",
        "card": "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)",
        "card-hover": "0 20px 40px -10px rgba(0,0,0,0.4)",
        "inner-glow": "inset 0 0 20px rgba(14,165,233,0.1)",
      },
    },
  },
  plugins: [],
};
