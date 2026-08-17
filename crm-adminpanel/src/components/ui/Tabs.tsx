'use client';

import { useRef, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  /** Small count or status shown after the label — e.g. an open-item count. */
  badge?: number | string | null;
  /** Draws the badge in the warning colour, for things that need attention. */
  urgent?: boolean;
}

/**
 * Horizontal tab bar. Controlled: the parent owns the active id.
 *
 * Roving-tabindex keyboard model — only the active tab is in the tab order, and
 * arrow keys move between tabs. That is what screen readers and keyboard users
 * expect from a tablist, and it keeps long tab rows from trapping Tab presses.
 */
export function Tabs({
  tabs, active, onChange, className = '',
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;

    e.preventDefault();
    onChange(tabs[next].id);
    // Move focus with the selection so the next arrow press continues from here.
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={ref}
      role="tablist"
      onKeyDown={onKeyDown}
      className={`flex items-stretch gap-1 overflow-x-auto crm-scroll-hidden ${className}`}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className="relative whitespace-nowrap px-4 py-2.5 text-[13px] font-medium transition-colors duration-150"
            style={{ color: on ? 'var(--gold-soft)' : 'var(--text-dim)' }}
          >
            {t.label}
            {t.badge != null && t.badge !== 0 && (
              <span
                className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle"
                style={
                  t.urgent
                    ? { background: 'rgba(232,179,57,.18)', color: 'var(--warn)' }
                    : { background: 'rgba(255,255,255,.06)', color: 'var(--muted)' }
                }
              >
                {t.badge}
              </span>
            )}
            {on && (
              <span
                aria-hidden
                className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full"
                style={{ background: 'var(--gold-grad)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Wrapper that ties panel content back to its tab for assistive tech. */
export function TabPanel({
  id, active, children,
}: { id: string; active: string; children: ReactNode }) {
  if (id !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className="animate-in"
    >
      {children}
    </div>
  );
}
