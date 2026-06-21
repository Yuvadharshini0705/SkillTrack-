/**
 * PageShell.jsx — Wraps every page with an entrance animation.
 * Provides consistent fade-in + slide-up for all route changes.
 */
import { useEffect, useState } from "react";
import { useReducedMotion } from "../../utils/animations";

export default function PageShell({ children, className = "" }) {
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Small rAF delay so the animation fires after paint
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={className}
      style={
        reduced
          ? {}
          : {
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(18px)",
              transition:
                "opacity 0.40s cubic-bezier(0.4,0,0.2,1), transform 0.40s cubic-bezier(0.4,0,0.2,1)",
            }
      }
    >
      {children}
    </div>
  );
}