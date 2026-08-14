'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Stretch to the container and centre the label — used inside narrow columns. */
  full?: boolean;
  /** Label shown (and disabled state forced) while an action is in flight. */
  busyLabel?: string;
  busy?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export function Button({
  variant = 'ghost', full, busy, busyLabel, className = '', disabled, children, ...rest
}: ButtonProps) {
  return (
    <button
      className={`${VARIANT[variant]} ${full ? 'w-full justify-center' : ''} ${className}`}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

/** The right-aligned Cancel/Confirm row every form and modal ends with. */
export function FormActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex gap-2 justify-end ${className}`}>{children}</div>;
}
