'use client';

import type { ReactNode } from 'react';

export interface StatItem {
  label: ReactNode;
  value?: ReactNode;
  /** Rendered instead of `value` when the metric is a badge or other node. */
  node?: ReactNode;
  /** Gold-gradient the value — for the headline metric only. */
  hero?: boolean;
  /** Pulsing green dot next to the label, for realtime metrics. */
  live?: boolean;
}

export function StatCard({ label, value, node, hero, live }: StatItem) {
  return (
    <div className="stat">
      <div className="stat-label flex items-center gap-2">
        {label}
        {live && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--pos)', boxShadow: '0 0 8px rgba(74,222,128,.8)' }}
          />
        )}
      </div>
      <div className={node ? 'mt-2' : `stat-value ${hero ? 'gold-text' : ''}`}>{node ?? value}</div>
    </div>
  );
}

/** Responsive grid of stat cards. `cols` is the widescreen column count. */
export function StatGrid({ items, cols = 4 }: { items: StatItem[]; cols?: 4 | 5 }) {
  // Class names spelled out so Tailwind can see them.
  const grid = cols === 5 ? 'grid-cols-2 md:grid-cols-5 gap-3' : 'grid-cols-2 lg:grid-cols-4 gap-4';
  return (
    <div className={`grid ${grid}`}>
      {items.map((s, i) => <StatCard key={i} {...s} />)}
    </div>
  );
}

/** Compact divided strip of secondary numbers. */
export function StatStrip({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <div className="panel p-1.5">
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x" style={{ borderColor: 'var(--border)' }}>
        {items.map((t, i) => (
          <div key={i} className="px-4 py-3">
            <div className="eyebrow">{t.label}</div>
            <div className="display text-[20px] mt-1.5">{t.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
