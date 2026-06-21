/**
 * animations.js — Centralized animation utilities for SkillTrack
 * GPU-friendly transforms, prefers-reduced-motion support, reusable hooks.
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Reduced-motion detection ────────────────────────────────────────────────
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ─── Intersection-Observer-based entrance animation ──────────────────────────
export function useEntranceAnimation(options = {}) {
  const {
    threshold = 0.12,
    rootMargin = "0px 0px -40px 0px",
    once = true,
  } = options;

  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once, reduced]);

  return { ref, visible };
}

// ─── Stagger animation for list items ────────────────────────────────────────
export function useStaggerAnimation(count, baseDelay = 60) {
  const reduced = useReducedMotion();
  return Array.from({ length: count }, (_, i) => ({
    style: reduced
      ? {}
      : {
          animationDelay: `${i * baseDelay}ms`,
          animationFillMode: "both",
        },
    className: reduced ? "" : "animate-fade-in-up",
  }));
}

// ─── Counter animation hook ──────────────────────────────────────────────────
export function useCounterAnimation(target, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  const started = useRef(false);
  const frameRef = useRef(null);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    if (reduced) { setValue(target); return; }
    const startTime = performance.now() + delay;
    const tick = (now) => {
      if (now < startTime) { frameRef.current = requestAnimationFrame(tick); return; }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [target, duration, delay, reduced]);

  useEffect(() => {
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, []);

  return { value, start };
}

// ─── Page transition wrapper styles ─────────────────────────────────────────
export function getPageTransitionStyle(visible, reduced) {
  if (reduced) return {};
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(16px)",
    transition: "opacity 0.38s cubic-bezier(0.4,0,0.2,1), transform 0.38s cubic-bezier(0.4,0,0.2,1)",
  };
}

// ─── Spring-like hover scale (used via onMouseEnter/Leave) ──────────────────
export function useSpringHover(scale = 1.02) {
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const style = reduced
    ? {}
    : {
        transform: hovered ? `scale(${scale})` : "scale(1)",
        transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        willChange: "transform",
      };
  return {
    style,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}

// ─── Shimmer / skeleton loader inline style ──────────────────────────────────
export function getSkeletonStyle() {
  return {
    background: "linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hover) 50%, var(--bg-card) 75%)",
    backgroundSize: "300% 100%",
    animation: "skeleton-shimmer 1.5s ease-in-out infinite",
    borderRadius: "0.75rem",
  };
}

// ─── Ripple effect hook (for buttons) ────────────────────────────────────────
export function useRipple() {
  const [ripples, setRipples] = useState([]);
  const reduced = useReducedMotion();

  const createRipple = useCallback((e) => {
    if (reduced) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, size, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
  }, [reduced]);

  return { ripples, createRipple };
}

// ─── Modal animation styles ──────────────────────────────────────────────────
export function getModalBackdropStyle(open, reduced) {
  if (reduced) return { display: open ? "flex" : "none" };
  return {
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "opacity 0.22s ease",
  };
}

export function getModalPanelStyle(open, reduced) {
  if (reduced) return {};
  return {
    opacity: open ? 1 : 0,
    transform: open ? "scale(1) translateY(0)" : "scale(0.95) translateY(12px)",
    transition: "opacity 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.34,1.2,0.64,1)",
  };
}