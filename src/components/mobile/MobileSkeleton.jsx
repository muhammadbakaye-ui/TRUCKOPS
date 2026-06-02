import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

// ─── Shimmer base ─────────────────────────────────────────────────────────────

function Shimmer({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton-shimmer rounded ${className}`}
      style={style}
    />
  );
}

// ─── Skeleton card — matches the shape of MobileLoadCard ─────────────────────

export function MobileSkeletonCard() {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 space-y-2.5">
      {/* Top row: load# + status badge */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-3.5 w-24" />
        <Shimmer className="h-5 w-16 rounded-full" />
      </div>
      {/* Customer name */}
      <Shimmer className="h-3 w-40" />
      {/* Route */}
      <Shimmer className="h-3 w-56" />
      {/* Driver / truck row */}
      <div className="flex gap-4">
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-3 w-16" />
      </div>
      {/* Bottom divider row: amount + invoice status */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Skeleton list (N cards) ──────────────────────────────────────────────────

export function MobileSkeletonList({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <MobileSkeletonCard key={i} />
      ))}
    </div>
  );
}

// ─── Skeleton stat grid — matches the 2-col dashboard stat grid ───────────────

export function MobileSkeletonStatGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border/60 rounded-lg p-3 flex items-center justify-between">
          <div className="space-y-2">
            <Shimmer className="h-2.5 w-20" />
            <Shimmer className="h-7 w-10" />
          </div>
          <Shimmer className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton section — for detail/form pages (a labelled block) ──────────────

export function MobileSkeletonSection({ rows = 4 }) {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 space-y-3">
      <Shimmer className="h-3 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Shimmer className="h-2.5 w-20" />
          <Shimmer className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton chart block ─────────────────────────────────────────────────────

export function MobileSkeletonChart() {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Shimmer className="h-3.5 w-40" />
          <Shimmer className="h-2.5 w-24" />
        </div>
        <Shimmer className="h-6 w-20" />
      </div>
      <Shimmer className="h-[150px] w-full rounded-md" />
    </div>
  );
}

// ─── Full-page centered spinner ───────────────────────────────────────────────

export function MobilePageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div
        className="w-8 h-8 rounded-full border-4 border-border animate-spin"
        style={{ borderTopColor: '#3d6fff' }}
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function MobileErrorState({ onRetry, message = 'Failed to load. Tap to retry.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium active:bg-primary/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Skeleton dashboard mini-activity list ────────────────────────────────────

export function MobileSkeletonActivityList({ count = 5 }) {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-muted mt-1.5 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3 w-4/5" />
            <Shimmer className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton top-drivers list ────────────────────────────────────────────────

export function MobileSkeletonDriverList({ count = 3 }) {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Shimmer className="w-7 h-7 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Shimmer className="h-3 w-28" />
              <Shimmer className="h-3 w-14" />
            </div>
            <Shimmer className="h-1.5 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}