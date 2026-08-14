'use client';

import type { ReactNode } from 'react';

type Tone = 'error' | 'warn' | 'info' | 'success' | 'neutral';

const TONE: Record<Tone, string> = {
  error: 'var(--neg)',
  warn: 'var(--warn)',
  info: 'var(--info)',
  success: 'var(--pos)',
  neutral: 'var(--text)',
};

/** Inline form error — the red line above a submit row. */
export function ErrorText({ children, className = 'mb-3' }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return <div className={`text-sm ${className}`} style={{ color: 'var(--neg)' }}>{children}</div>;
}

/** Page-level message on its own surface. */
export function Notice({
  tone = 'neutral', children, className = '',
}: { tone?: Tone; children: ReactNode; className?: string }) {
  if (!children) return null;
  return <div className={`panel p-3 text-sm ${className}`} style={{ color: TONE[tone] }}>{children}</div>;
}

/** Tinted callout with its own background — used for the login error. */
export function Callout({ tone = 'error', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  const c = TONE[tone];
  return (
    <div
      className={`text-[12.5px] rounded-[10px] px-3 py-2.5 ${className}`}
      style={{ background: `${c}1A`, border: `1px solid ${c}47`, color: c }}
    >
      {children}
    </div>
  );
}

/** Whole-page "there is nothing here / not configured" surface. */
export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="panel-lux p-12 text-center animate-in">
      <h1 className="display text-[22px] mb-2">{title}</h1>
      {children && <p className="muted text-[13px] max-w-md mx-auto leading-relaxed">{children}</p>}
    </div>
  );
}

/** Monospace value on an inset surface — URLs, generated passwords, keys. */
export function CodeBlock({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <code className={`block panel p-2 text-sm break-all ${className}`} style={{ background: 'var(--inset)' }}>
      {children}
    </code>
  );
}

/** Boxed body text on the inset surface — notes, credential summaries, alerts. */
export function InsetBox({
  children, bordered, className = 'p-3',
}: { children: ReactNode; bordered?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-[10px] ${className}`}
      style={{ background: 'var(--inset)', border: bordered ? '1px solid var(--border)' : undefined }}
    >
      {children}
    </div>
  );
}
