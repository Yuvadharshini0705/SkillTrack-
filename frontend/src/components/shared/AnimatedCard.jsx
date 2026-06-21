/**
 * AnimatedCard.jsx — Drop-in replacement for plain <div className="card">.
 * Adds: staggered entrance, hover lift, ripple on click, glow border.
 */
import { useRef, useState } from "react";
import { useEntranceAnimation, useReducedMotion } from "../../utils/animations";

export default function AnimatedCard({
  children,
  className = "",
  delay = 0,
  onClick,
  hoverable = true,
  style = {},
  as: Tag = "div",
}) {
  const { ref, visible } = useEntranceAnimation();
  const reduced = useReducedMotion();
  const [ripples, setRipples] = useState([]);
  const containerRef = useRef(null);

  const mergedRef = (node) => {
    ref.current = node;
    containerRef.current = node;
  };

  const addRipple = (e) => {
    if (reduced || !onClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, size, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 550);
  };

  const entranceStyle = reduced
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
      };

  return (
    <Tag
      ref={mergedRef}
      className={`card relative overflow-hidden ${hoverable ? "hover-lift" : ""} ${className}`}
      style={{ ...entranceStyle, ...style }}
      onClick={(e) => { addRipple(e); onClick && onClick(e); }}
    >
      {/* Ripple effects */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            background: "rgba(99,102,241,0.12)",
            animation: "ripple-expand 0.55s cubic-bezier(0,0,0.2,1) forwards",
          }}
        />
      ))}
      {children}
    </Tag>
  );
}