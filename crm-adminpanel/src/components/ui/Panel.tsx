'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface PanelProps {
  title?: ReactNode;
  /** Small uppercase line under the title. */
  eyebrow?: ReactNode;
  /** Muted sentence under the heading. */
  description?: ReactNode;
  /** Right-hand side of the heading row (a link, a button, a badge). */
  action?: ReactNode;
  /** Use the gold hairline "feature" surface. */
  lux?: boolean;
  padding?: string;
  className?: string;
  children?: ReactNode;
}

export function Panel({
  title, eyebrow, description, action, lux, padding = 'p-4', className = '', children,
}: PanelProps) {
  const heading = title || eyebrow || action;
  return (
    <div className={`${lux ? 'panel-lux' : 'panel'} ${padding} ${className}`}>
      {heading && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            {title && <h2 className="display text-[17px]">{title}</h2>}
            {eyebrow && <div className="eyebrow mt-0.5">{eyebrow}</div>}
          </div>
          {action}
        </div>
      )}
      {description && <p className="muted text-xs -mt-2 mb-4">{description}</p>}
      {children}
    </div>
  );
}

/** "View all →" style link used in panel headings. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[12px] font-semibold" style={{ color: 'var(--gold-soft)' }}>
      {children}
    </Link>
  );
}
