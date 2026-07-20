'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, Volume1, VolumeX, RotateCcw, RotateCw, RefreshCw, Loader2, Scan, Maximize2, ZoomIn } from 'lucide-react';

type VideoFit = 'fit' | 'fill' | 'zoom';
const FIT_ORDER: VideoFit[] = ['fit', 'fill', 'zoom'];
const FIT_META: Record<VideoFit, { label: string; icon: typeof Scan }> = {
  fit: { label: 'Fit', icon: Scan },
  fill: { label: 'Fill', icon: Maximize2 },
  zoom: { label: 'Zoom', icon: ZoomIn },
};
import { formatTime } from '@/lib/utils';
import type { WatchStateDto } from '@/lib/socket';

const REACTION_EMOJI = ['😂', '🤣', '😘', '❤️', '👏'];

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

interface Props {
  src: string;
  state: WatchStateDto | null;
  partnerName?: string;
  resumeTime?: number;
  floatingReactions?: FloatingEmoji[];
  /** Name of a participant everyone is waiting on (buffering) — soft-pauses here. */
  waitingFor?: string | null;
  onReaction?: (emoji: string) => void;
  onBuffering?: (buffering: boolean) => void;
  onPlay: (timestamp: number) => void;
  onPause: (timestamp: number) => void;
  onSeek: (timestamp: number) => void;
  onTimeUpdate?: (timestamp: number, duration: number) => void;
}

export function SyncVideoPlayer({
  src,
  state,
  partnerName,
  resumeTime,
  floatingReactions,
  waitingFor,
  onReaction,
  onBuffering,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastApplied = useRef<{ ts: number; isPlaying: boolean } | null>(null);
  const timeUpdateFrame = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [synced, setSynced] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [slowNet, setSlowNet] = useState(false);
  const [videoFit, setVideoFit] = useState<VideoFit>('fit'); // default Fit; toggle to Fill/Zoom
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const bufferTimer = useRef<NodeJS.Timeout | null>(null);
  const bufferingReported = useRef(false);

  // Debounced buffering report: only tell others we're stalling if it lasts
  // >1.5s. This stops brief initial-load / seek stalls from triggering the
  // cross-client "pause & wait" loop (the start-of-video play/pause flicker).
  const reportBuffering = useCallback((b: boolean) => {
    if (b) {
      if (bufferTimer.current || bufferingReported.current) return;
      bufferTimer.current = setTimeout(() => {
        bufferTimer.current = null;
        bufferingReported.current = true;
        onBuffering?.(true);
      }, 1500);
    } else {
      if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
      if (bufferingReported.current) { bufferingReported.current = false; onBuffering?.(false); }
    }
  }, [onBuffering]);

  // Network hint
  useEffect(() => {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean; addEventListener?: (e: string, cb: () => void) => void; removeEventListener?: (e: string, cb: () => void) => void } }).connection;
    if (!conn) return;
    const update = () => setSlowNet(!!conn.saveData || /(^|\W)(2g|slow-2g|3g)($|\W)/.test(conn.effectiveType ?? ''));
    update();
    conn.addEventListener?.('change', update);
    return () => conn.removeEventListener?.('change', update);
  }, []);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
  }, []);

  // Apply an explicit remote state change (play / pause / seek) — hard-align.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state) return;
    const last = lastApplied.current;
    if (last && last.ts === state.timestamp && last.isPlaying === state.isPlaying) return;
    lastApplied.current = { ts: state.timestamp, isPlaying: state.isPlaying };

    const elapsed = state.isPlaying ? Math.max(0, (Date.now() - state.updatedAt) / 1000) : 0;
    let target = state.timestamp + elapsed;
    if (Number.isFinite(video.duration) && video.duration > 0) target = Math.min(target, video.duration);

    if (Math.abs(video.currentTime - target) > 1.5) video.currentTime = target;
    if (state.isPlaying && video.paused && !waitingFor) void video.play().catch(() => undefined);
    if (!state.isPlaying && !video.paused) video.pause();
    setSynced(true);
  }, [state, waitingFor]);

  // Smooth continuous drift correction: nudge playbackRate instead of jumping,
  // so nobody gets a jarring forward-skip. Big drifts still hard-align.
  // Runs every 800ms for tighter sync convergence (~2 cycles to correct 0.5s drift).
  useEffect(() => {
    if (!state?.isPlaying) return;
    let lastSynced = true;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || waitingFor) return;
      const target = state.timestamp + (Date.now() - state.updatedAt) / 1000;
      const drift = v.currentTime - target; // + ahead, - behind
      if (Math.abs(drift) > 2.5) {
        v.currentTime = Math.max(0, target);
        v.playbackRate = 1;
      } else if (drift > 0.3) {
        v.playbackRate = 0.93;
      } else if (drift < -0.3) {
        v.playbackRate = 1.07;
      } else {
        v.playbackRate = 1;
      }
      const nowSynced = Math.abs(drift) < 1;
      if (nowSynced !== lastSynced) { lastSynced = nowSynced; setSynced(nowSynced); }
    }, 800);
    return () => {
      clearInterval(id);
      const v = videoRef.current;
      if (v) v.playbackRate = 1;
    };
  }, [state, waitingFor]);

  // Soft-pause everyone while a participant is buffering; resume when they're back.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (waitingFor) {
      if (!v.paused) v.pause();
    } else if (state?.isPlaying && v.paused) {
      resync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingFor]);

  const resync = () => {
    const video = videoRef.current;
    if (!video || !state) return;
    const elapsed = state.isPlaying ? (Date.now() - state.updatedAt) / 1000 : 0;
    let target = state.timestamp + elapsed;
    if (Number.isFinite(video.duration) && video.duration > 0) target = Math.min(target, video.duration);
    video.currentTime = Math.max(0, target);
    if (state.isPlaying && video.paused && !waitingFor) void video.play().catch(() => undefined);
    setSynced(true);
  };

  const markLocal = (ts: number, playing: boolean) => {
    lastApplied.current = { ts, isPlaying: playing };
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      markLocal(video.currentTime, true);
      void video.play().catch(() => undefined);
      onPlay(video.currentTime);
    } else {
      markLocal(video.currentTime, false);
      video.pause();
      onPause(video.currentTime);
    }
  }, [onPlay, onPause]);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    markLocal(video.currentTime, !video.paused);
    onSeek(video.currentTime);
  }, [onSeek]);

  const seekToPct = (pct: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const value = Math.max(0, Math.min(1, pct)) * video.duration;
    video.currentTime = value;
    setTime(value);
    markLocal(value, !video.paused);
    onSeek(value);
  };

  const pctFromEvent = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0]?.clientX ?? 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const setVol = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    const v = Math.max(0, Math.min(1, val));
    video.volume = v;
    video.muted = v === 0;
  };

  const playedPct = duration ? (time / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full max-h-full overflow-hidden rounded-xl bg-black group touch-manipulation"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {loading && !error && !waitingFor ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-xs text-text-secondary">Loading video…</p>
          </div>
        </div>
      ) : null}

      {/* Waiting-for-participant overlay (pause-to-wait sync) */}
      {waitingFor ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-sm font-medium text-white">Waiting for {waitingFor} to catch up…</p>
            <p className="text-xs text-white/50">Playback will resume automatically</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
          <div className="text-center px-8">
            <p className="text-sm font-medium text-danger mb-2">Video failed to load</p>
            <p className="text-xs text-text-tertiary">The file may have expired or is unavailable.</p>
          </div>
        </div>
      ) : null}

      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        className="w-full h-full max-h-full bg-black cursor-pointer transition-transform duration-200"
        style={{
          objectFit: videoFit === 'fit' ? 'contain' : 'cover',
          transform: videoFit === 'zoom' ? 'scale(1.25)' : 'scale(1)',
        }}
        onClick={togglePlay}
        onPlay={() => { setIsPlaying(true); resetHideTimer(); }}
        onPause={() => { setIsPlaying(false); setShowControls(true); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          // Throttle UI time updates to ~4Hz to avoid 60fps re-renders
          const now = Date.now();
          if (now - timeUpdateFrame.current > 250) {
            timeUpdateFrame.current = now;
            setTime(v.currentTime);
            if (v.buffered.length) {
              setBuffered((v.buffered.end(v.buffered.length - 1) / (v.duration || 1)) * 100);
            }
          }
          if (onTimeUpdate) onTimeUpdate(v.currentTime, v.duration);
        }}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length) setBuffered((v.buffered.end(v.buffered.length - 1) / (v.duration || 1)) * 100);
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          setLoading(false);
          // Resume where you left off: apply saved position when there's no
          // active shared play-state, or the shared state is paused. This makes
          // "resume" work for solo watching and when re-opening a paused video.
          if ((!state || !state.isPlaying) && resumeTime && resumeTime > 5 && resumeTime < v.duration - 5) {
            v.currentTime = resumeTime;
            setTime(resumeTime);
          }
        }}
        onWaiting={() => { setLoading(true); reportBuffering(true); }}
        onPlaying={() => { setLoading(false); reportBuffering(false); }}
        onCanPlay={() => { setLoading(false); reportBuffering(false); }}
        onError={() => { setError(true); setLoading(false); reportBuffering(false); }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
      />

      {/* Floating reactions */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {(floatingReactions ?? []).map((r) => (
          <span key={r.id} className="absolute bottom-20 text-3xl animate-float-up" style={{ left: `${r.x}%` }}>
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-12 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {onReaction ? (
          <div className="flex items-center justify-center gap-1.5 pb-1">
            {REACTION_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => onReaction(e)}
                className="rounded-full bg-white/10 px-2 py-1 text-lg leading-none transition-transform hover:scale-125 hover:bg-white/20 active:scale-95"
                aria-label={`React ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}

        {/* Seek bar: buffered + played + hover-scrub tooltip */}
        <div
          className="group/seek relative flex h-6 cursor-pointer items-center touch-none"
          onClick={(e) => seekToPct(pctFromEvent(e))}
          onTouchStart={(e) => { e.preventDefault(); seekToPct(pctFromEvent(e)); }}
          onTouchMove={(e) => { e.preventDefault(); seekToPct(pctFromEvent(e)); }}
          onMouseMove={(e) => setHoverPct(pctFromEvent(e) * 100)}
          onMouseLeave={() => setHoverPct(null)}
        >
          <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-all group-hover/seek:h-2">
            {/* buffered */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${buffered}%` }} />
            {/* hover preview */}
            {hoverPct != null ? (
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${hoverPct}%` }} />
            ) : null}
            {/* played */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${playedPct}%` }} />
            {/* thumb */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/seek:opacity-100"
              style={{ left: `${playedPct}%` }}
            />
          </div>
          {/* time tooltip */}
          {hoverPct != null && duration ? (
            <div
              className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white"
              style={{ left: `${hoverPct}%` }}
            >
              {formatTime((hoverPct / 100) * duration)}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={togglePlay} className="rounded-full p-2 hover:bg-white/10 transition-colors" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={() => seekBy(-10)} className="rounded-full p-1.5 hover:bg-white/10 transition-colors hidden sm:flex" aria-label="Back 10s">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => seekBy(10)} className="rounded-full p-1.5 hover:bg-white/10 transition-colors hidden sm:flex" aria-label="Forward 10s">
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Volume: mute toggle + hover-reveal slider */}
            <div className="group/vol flex items-center">
              <button
                onClick={() => setVol(muted || volume === 0 ? 0.6 : 0)}
                className="rounded-full p-1.5 hover:bg-white/10 transition-colors"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 0.5 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={muted ? 0 : volume}
                onChange={(e) => setVol(Number(e.target.value))}
                aria-label="Volume"
                className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-200 group-hover/vol:w-16 group-hover/vol:opacity-100 md:group-hover/vol:mr-1
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                style={{ backgroundSize: `${(muted ? 0 : volume) * 100}% 100%`, backgroundImage: 'linear-gradient(#fff,#fff)', backgroundRepeat: 'no-repeat' }}
              />
            </div>

            <span className="ml-1 font-mono text-[10px] sm:text-[11px] text-white/70">
              {formatTime(time)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {slowNet ? (
              <span className="hidden sm:inline-flex rounded-pill border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-[10px] text-warning font-medium" title="Your connection is slow — playback may buffer">
                Slow network
              </span>
            ) : null}
            {synced ? (
              <span className="hidden sm:inline-flex rounded-pill border border-success/40 bg-success/10 px-2.5 py-0.5 text-[10px] text-success font-medium">
                Synced{partnerName ? ` · ${partnerName}` : ''}
              </span>
            ) : (
              <button
                onClick={resync}
                className="inline-flex items-center gap-1 rounded-pill border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-[10px] text-warning font-medium hover:bg-warning/20 transition-colors"
                title="Click to resync"
              >
                <RefreshCw className="h-3 w-3" /> Resync
              </button>
            )}
            {/* Fit / Fill / Zoom toggle for the video content */}
            {(() => {
              const Icon = FIT_META[videoFit].icon;
              return (
                <button
                  onClick={() => setVideoFit(FIT_ORDER[(FIT_ORDER.indexOf(videoFit) + 1) % FIT_ORDER.length])}
                  className="flex items-center gap-1 rounded-full p-1.5 hover:bg-white/10 transition-colors"
                  title={`Display: ${FIT_META[videoFit].label} (tap to change)`}
                  aria-label="Change video display mode"
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
