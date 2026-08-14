'use client';

import type { ReactNode } from 'react';

/** One dotted entry in a vertical history rail. */
export function TimelineItem({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="timeline-item">
      <div className="text-[13px] font-medium flex items-center gap-2 flex-wrap">{title}</div>
      {meta && <div className="muted text-[11px] mt-0.5">{meta}</div>}
    </div>
  );
}

/** Lighter variant with a plain left rule — used for lead history. */
export function HistoryItem({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="text-sm border-l-2 pl-3" style={{ borderColor: 'var(--border)' }}>
      <div className="font-medium">{title}</div>
      {meta && <div className="muted text-xs">{meta}</div>}
    </div>
  );
}

/** Two-line row used in feeds: primary text, muted detail, trailing node. */
export function FeedRow({
  title, meta, trailing,
}: { title: ReactNode; meta?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate">{title}</div>
        {meta && <div className="muted text-[11px] truncate mt-0.5">{meta}</div>}
      </div>
      {trailing}
    </div>
  );
}
