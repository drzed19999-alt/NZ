'use client';

import type { ReactNode } from 'react';
import { statusColor } from '@/lib/format';

type Tone = 'pos' | 'neg' | 'warn' | 'info' | 'gold' | 'violet';

const TONE: Record<Tone, string> = {
  pos: '#4ADE80',
  neg: '#F87171',
  warn: '#E8B339',
  info: '#7DA6E8',
  gold: '#D4AF37',
  violet: '#A78BDB',
};

/**
 * Base pill. Colour comes from `tone` or an explicit CSS colour; the tint and
 * border are derived from it so every badge in the app shades the same way.
 */
export function Pill({
  tone = 'gold', color, className = '', children,
}: { tone?: Tone; color?: string; className?: string; children: ReactNode }) {
  const c = color ?? TONE[tone];
  return (
    <span className={`badge ${className}`} style={{ background: `${c}1A`, color: c, borderColor: `${c}40` }}>
      {children}
    </span>
  );
}

/** Lead / account / KYC / transaction status, coloured by the shared map. */
export function StatusBadge({ status }: { status: string }) {
  return <Pill color={statusColor(status)}>{status}</Pill>;
}

/** Integration or secret presence. */
export function ConfiguredPill({ on }: { on: boolean }) {
  return <Pill tone={on ? 'pos' : 'warn'}>{on ? 'Configured' : 'Not set'}</Pill>;
}

export function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className="inline-block w-[7px] h-[7px] rounded-full mr-2 align-middle shrink-0"
      style={{
        background: online ? 'var(--pos)' : 'var(--muted)',
        boxShadow: online ? '0 0 8px rgba(74,222,128,.75)' : 'none',
      }}
    />
  );
}
