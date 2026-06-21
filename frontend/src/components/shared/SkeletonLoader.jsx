/**
 * SkeletonLoader.jsx — Reusable shimmer skeleton blocks.
 * Usage: <Skeleton w="100%" h={20} /> or <SkeletonCard />
 */

export function Skeleton({ w = "100%", h = 16, rounded = "0.75rem", className = "" }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{ width: w, height: h, borderRadius: rounded, flexShrink: 0 }}
    />
  );
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card space-y-4">
      <Skeleton h={20} w="60%" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} h={14} w={i === rows - 1 ? "45%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card flex items-center gap-4">
      <Skeleton w={48} h={48} rounded="0.875rem" />
      <div className="flex-1 space-y-2">
        <Skeleton h={28} w="50%" />
        <Skeleton h={13} w="70%" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border-soft)]">
      <Skeleton w={36} h={36} rounded="50%" />
      <Skeleton w={140} h={14} />
      <Skeleton w={90} h={14} className="ml-auto" />
      <Skeleton w={70} h={22} rounded="999px" />
    </div>
  );
}

export function SkeletonText({ lines = 3, lastWidth = "60%" }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={13} w={i === lines - 1 ? lastWidth : "100%"} />
      ))}
    </div>
  );
}