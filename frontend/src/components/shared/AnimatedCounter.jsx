/**
 * AnimatedCounter.jsx — Counts up from 0 to target when it enters the viewport.
 */
import { useEffect } from "react";
import { useEntranceAnimation, useCounterAnimation } from "../../utils/animations";

export default function AnimatedCounter({ value = 0, duration = 900, suffix = "", className = "" }) {
  const { ref, visible } = useEntranceAnimation({ threshold: 0.3 });
  const { value: displayed, start } = useCounterAnimation(value, duration);

  useEffect(() => {
    if (visible) start();
  }, [visible, start]);

  return (
    <span ref={ref} className={className}>
      {displayed}{suffix}
    </span>
  );
}