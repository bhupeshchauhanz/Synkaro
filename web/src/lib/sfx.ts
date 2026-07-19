'use client';

/**
 * Central sound-effect helper. Every sound shipped in /public/sounds is mapped
 * here so the whole app plays audio consistently (and we never reference a file
 * that doesn't exist).
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

interface PlayOpts {
  loop?: boolean;
  volume?: number;
}

/** Play a one-shot (or looping) sound. Returns the element so callers can stop it. */
export function playSfx(name: SfxName, opts: PlayOpts = {}): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    const audio = new Audio(FILES[name]);
    audio.loop = opts.loop ?? false;
    audio.volume = opts.volume ?? 1;
    // Autoplay can be blocked before a user gesture — swallow the rejection.
    void audio.play().catch(() => undefined);
    return audio;
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
