// frontend/src/components/shared/SkillRing.jsx
// Enhanced: animated stroke-dasharray entrance, color transition, glow pulse

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../utils/animations";

export default function SkillRing({ score = 0, size = 80, label = "" }) {
  const radius     = (size - 10) / 2;
  const circumf    = 2 * Math.PI * radius;
  const filled     = Math.min(Math.max(score, 0), 100);
  const [animated, setAnimated] = useState(0);
  const reduced    = useReducedMotion();
  const startRef   = useRef(null);
  const frameRef   = useRef(null);

  const color =
    filled >= 80 ? "#10b981" :
    filled >= 60 ? "#0ea5e9" :
    filled >= 45 ? "#f59e0b" :
    "#ef4444";

  const glowColor =
    filled >= 80 ? "rgba(16,185,129,0.5)" :
    filled >= 60 ? "rgba(14,165,233,0.5)" :
    filled >= 45 ? "rgba(245,158,11,0.5)" :
    "rgba(239,68,68,0.5)";

  useEffect(() => {
    if (reduced) { setAnimated(filled); return; }
    // Animate from 0 → filled
    const duration = 1100;
    const startVal = 0;
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed  = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setAnimated(eased * filled);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [filled, reduced]);

  const strokeDash = (animated / 100) * circumf;

  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth={6}
        />
        {/* Glow copy */}
        {!reduced && filled > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumf}`}
            opacity={0.18}
            style={{ filter: `blur(3px)` }}
          />
        )}
        {/* Main arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumf}`}
          style={{
            transition: reduced ? "none" : "stroke 0.5s ease",
            filter: `drop-shadow(0 0 4px ${glowColor})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold"
          style={{
            color: color,
            fontSize: size * 0.22,
            lineHeight: 1,
            transition: "color 0.5s ease",
          }}
        >
          {Math.round(animated)}
        </span>
        {label && (
          <span
            style={{
              fontSize: size * 0.12,
              color: "var(--text-muted)",
              marginTop: 1,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}