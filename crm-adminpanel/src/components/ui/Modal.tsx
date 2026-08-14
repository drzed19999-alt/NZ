'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Size = 'sm' | 'md' | 'lg';

const WIDTH: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Dialog rendered into <body> via a portal.
 *
 * Pages animate in with `.animate-in` (a transform keyframe animation), and an
 * ancestor running a transform animation becomes the containing block for
 * `position: fixed` descendants — a backdrop nested inside the page would pin
 * itself to the content box instead of the viewport. Portalling out of that
 * subtree is the only reliable fix.
 *
 * Closes on backdrop click and Escape; the panel swallows its own clicks.
 */
export function Modal({
  onClose, title, subtitle, size = 'md', footer, children,
}: {
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: Size;
  footer?: ReactNode;
  children: ReactNode;
}) {
  // A portal needs a DOM target, which doesn't exist during the server render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`panel p-6 w-full ${WIDTH[size]}`} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className={`display text-[19px] ${subtitle ? 'mb-1' : 'mb-4'}`}>{title}</h2>}
        {subtitle && <div className="muted text-sm mb-4">{subtitle}</div>}
        {children}
        {footer && <div className="flex gap-2 justify-end mt-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
