'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { playChime, warmAudio } from '@/lib/sound';

type Tone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextValue {
  toast: (tone: Tone, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--pos)',
  error: 'var(--neg)',
  info: 'var(--info)',
  warning: 'var(--warn)',
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Arm the audio context on the first gesture so the first alert that matters
  // is audible; browsers refuse to play before any user interaction.
  useEffect(() => { warmAudio(); }, []);

  const toast = useCallback((tone: Tone, title: string, message?: string, duration = 5000) => {
    const id = ++nextId;
    setItems((prev) => [...prev, { id, tone, title, message, duration }]);
    playChime(tone);
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  const value: ToastContextValue = {
    toast,
    success: (t, m) => toast('success', t, m),
    error: (t, m) => toast('error', t, m),
    info: (t, m) => toast('info', t, m),
    warning: (t, m) => toast('warning', t, m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
          pointerEvents: 'none',
        }}>
          {items.map((t) => (
            <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const color = TONE_COLOR[item.tone];
  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: 'linear-gradient(180deg, rgba(255,255,255,.03), transparent 60%), var(--panel)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--glow)',
        padding: '12px 14px 12px 14px',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        animation: 'toastIn .35s cubic-bezier(.2,.7,.3,1) both',
        cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
      }}
      onClick={onClose}
    >
      <div style={{ flexShrink: 0, marginTop: 1, color, fontSize: 15 }}>
        {item.tone === 'success' && '✓'}
        {item.tone === 'error' && '✗'}
        {item.tone === 'info' && 'ℹ'}
        {item.tone === 'warning' && '⚠'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{item.title}</div>
        {item.message && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>{item.message}</div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          flexShrink: 0, background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 2px',
        }}
        aria-label="Close"
      >&times;</button>
      {item.duration > 0 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: color, opacity: 0.5,
          animation: `toastShrink ${item.duration}ms linear forwards`,
          transformOrigin: 'left',
        }} />
      )}
    </div>
  );
}
