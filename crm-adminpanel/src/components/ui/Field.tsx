'use client';

import type {
  InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';

/** Label + optional help text wrapper. Children are the control. */
export function Field({
  label, hint, className = '', children,
}: { label?: ReactNode; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <div className="muted text-[11px] mt-1">{hint}</div>}
    </div>
  );
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />;
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className}`} {...rest} />;
}

/** An option as a bare value, or an explicit value/label pair. */
export type Option = string | number | { value: string | number; label: ReactNode };

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: Option[];
  /** Prepended option for the "no filter" / "unassigned" case. */
  placeholder?: string;
}

export function Select({ options, placeholder, className = '', children, ...rest }: SelectProps) {
  return (
    <select className={`input ${className}`} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((o) => {
        const [value, label] = typeof o === 'object' ? [o.value, o.label] : [o, o];
        return <option key={value} value={value}>{label}</option>;
      })}
      {children}
    </select>
  );
}

export function Checkbox({
  label, className = '', ...rest
}: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex items-center gap-2 text-xs cursor-pointer ${className}`}>
      <input type="checkbox" {...rest} />
      {label}
    </label>
  );
}

/** Radio with a bold title and a subdued explanation underneath. */
export function RadioCard({
  title, description, className = '', ...rest
}: { title: ReactNode; description?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex items-start gap-2 cursor-pointer ${className}`}>
      <input type="radio" className="mt-1" {...rest} />
      <span className="text-sm">
        <b>{title}</b>
        {description && <div className="muted text-xs">{description}</div>}
      </span>
    </label>
  );
}
