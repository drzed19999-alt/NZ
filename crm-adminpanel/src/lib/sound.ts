'use client';

// Notification chime, synthesised with the Web Audio API rather than shipped as
// an audio file: nothing to download, nothing to 404, and no binary in the repo.
//
// Browsers block audio until the user has interacted with the page, so the
// context is created lazily on the first gesture. A toast that fires before any
// interaction is silent — that is the autoplay policy, not a bug.

type Tone = 'success' | 'error' | 'info' | 'warning';

const MUTE_KEY = 'crm_sound_muted';

let ctx: AudioContext | null = null;
let warmed = false;

export function isMuted(): boolean {
  if (typeof window === 'undefined') return true;
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function setMuted(v: boolean): void {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* private mode */ }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  return ctx;
}

/** Call once from a client component so the first real alert is audible. */
export function warmAudio(): void {
  if (warmed || typeof window === 'undefined') return;
  warmed = true;
  const once = () => { ensureCtx(); };
  window.addEventListener('pointerdown', once, { once: true });
  window.addEventListener('keydown', once, { once: true });
}

/**
 * Two short notes: rising for good news, falling for errors, flat for warnings —
 * so an admin can tell what happened without looking at the screen.
 */
export function playChime(tone: Tone = 'info'): void {
  if (isMuted()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});

  const notes = tone === 'error' ? [660, 440] : tone === 'warning' ? [560, 560] : [660, 880];
  const t0 = c.currentTime;

  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // Short attack/decay: a click without an envelope, a drone with too much.
    const start = t0 + i * 0.11;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}
