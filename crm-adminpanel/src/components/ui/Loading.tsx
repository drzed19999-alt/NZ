'use client';

import { BRAND } from '@/lib/brand';

/* ============================================================================
   Loading primitives.
   Skeletons mirror the shape of the real content so the layout never jumps;
   the orbital crest is used for whole-page waits.
   ========================================================================== */

/** Branded orbital spinner. `size` is the diameter in px. */
export function Orbit({ size = 44 }: { size?: number }) {
  return (
    <div className="orbit" style={{ width: size, height: size }}>
      <span className="orbit-core" style={{ fontSize: size * 0.3 }}>
        {BRAND.monogram}
      </span>
    </div>
  );
}

/** Full-panel loader with a message. Use for first paint of a page. */
export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="panel-lux flex flex-col items-center justify-center py-24 animate-in">
      <Orbit size={52} />
      <div className="mt-5 flex items-center gap-2">
        <span className="eyebrow">{label}</span>
        <span className="dots"><i /><i /><i /></span>
      </div>
    </div>
  );
}

/** Inline spinner for buttons / small areas. */
export function InlineLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Orbit size={18} />
      {label && <span className="muted text-[12.5px]">{label}</span>}
    </span>
  );
}

/** A single skeleton bar. Width accepts any CSS length or %. */
export function Skel({ w = '100%', h = 12, className = '' }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h }} />;
}

/** Skeleton rows shaped like a table body. */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  // Varied widths read as real data rather than a grid of identical bars.
  const widths = ['62%', '80%', '45%', '70%', '55%', '38%', '74%', '50%'];
  return (
    <tbody className="skeleton-stagger">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td className="td" key={c}>
              <Skel w={widths[(r + c) % widths.length]} h={11} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/** Skeleton for the metric tiles on the dashboard. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 skeleton-stagger">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat">
          <Skel w="52%" h={9} />
          <div className="mt-3"><Skel w="72%" h={24} /></div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton list rows (feeds, notes, timelines). */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 skeleton-stagger">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-1">
          <div className="flex-1 space-y-2">
            <Skel w={`${52 + ((i * 13) % 30)}%`} h={11} />
            <Skel w={`${34 + ((i * 17) % 26)}%`} h={9} />
          </div>
          <Skel w={62} h={18} className="rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Thin indeterminate bar — good for background refreshes. */
export function ProgressLine() {
  return <div className="progress-line"><span /></div>;
}
