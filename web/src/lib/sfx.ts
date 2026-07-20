'use client';

/**
 * Central sound-effect helper. Every sound shipped in /public/sounds is mapped
 * here. Sounds are PRELOADED and reused so they play instantly & cleanly (no
 * 2-3s network delay on first play).
 */
export type SfxName =
  | 'incoming' // someone is calling you
  | 'outgoing' // you're calling, waiting for pickup
  | 'notification' // new chat message
  | 'left' // a participant left the call
  | 'unmute' // mic/cam toggled on
  | 'airhorn'; // fun airhorn blast

const FILES: Record<SfxName, string> = {
  incoming: '/sounds/incoming-call.mp3',
  outgoing: '/sounds/outgoing-ring.mp3',
  notification: '/sounds/notification.mp3',
  left: '/sounds/left.mp3',
  unmute: '/sounds/unmute.mp3',
  airhorn: '/sounds/airhorn.mp3',
};

// One preloaded, fully-buffered element per sound (kept warm in memory).
const cache = new Map<SfxName, HTMLAudioElement>();

function base(name: SfxName): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let el = cache.get(name);
  if (!el) {
    el = new Audio(FILES[name]);
    el.preload = 'auto';
    try { el.load(); } catch { /* noop */ }
    cache.set(name, el);
  }
  return el;
}

/** Warm up all sounds ahead of time (call when a call/watch view mounts). */
export function preloadSfx(): void {
  if (typeof window === 'undefined') return;
  (Object.keys(FILES) as SfxName[]).forEach(base);
}

interface PlayOpts {
  loop?: boolean;
  volume?: number;
}

/** Play a one-shot (or looping) sound. Returns the element so callers can stop it. */
export function playSfx(name: SfxName, opts: PlayOpts = {}): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    // Looping sounds (rings) reuse the single cached element.
    if (opts.loop) {
      const el = base(name);
      if (!el) return null;
      el.loop = true;
      el.volume = opts.volume ?? 1;
      try { el.currentTime = 0; } catch { /* noop */ }
      void el.play().catch(() => undefined);
      return el;
    }
    // One-shots clone the preloaded (already-buffered) element so overlapping
    // plays work and start instantly.
    const src = base(name);
    const el = (src?.cloneNode(true) as HTMLAudioElement) ?? new Audio(FILES[name]);
    el.volume = opts.volume ?? 1;
    void el.play().catch(() => undefined);
    return el;
  } catch {
    return null;
  }
}

/** Stop and release a sound previously started with playSfx. */
export function stopSfx(audio: HTMLAudioElement | null | undefined): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    /* noop */
  }
}
