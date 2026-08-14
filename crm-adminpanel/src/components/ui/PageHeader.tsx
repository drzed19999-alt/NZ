'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The heading block every page opens with: eyebrow, title, optional subtitle,
 * and actions pushed to the right.
 */
export function PageHeader({
  eyebrow, title, subtitle, actions, align = 'end',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** 'end' lines the actions up with the baseline; 'start' for tall headers. */
  align?: 'start' | 'end';
}) {
  return (
    // Written out in full — Tailwind only sees class names that appear literally.
    <div className={`flex ${align === 'start' ? 'items-start' : 'items-end'} justify-between gap-4 flex-wrap`}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className={`page-title ${eyebrow ? 'mt-1' : ''}`}>{title}</h1>
        {subtitle && <div className="muted text-[12.5px] mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="muted text-sm">← {children}</Link>;
}

/** Row of filters above a table. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex gap-2.5 flex-wrap">{children}</div>;
}
