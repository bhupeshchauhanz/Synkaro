'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { VideoTrack, isTrackReference, type TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { MicOff, Maximize2, Scan, SlidersHorizontal } from 'lucide-react';

export type FitMode = 'fill' | 'fit';

const MODES: { id: FitMode; label: string; icon: typeof Maximize2 }[] = [
  { id: 'fill', label: 'Smart Fill', icon: Maximize2 },
  { id: 'fit', label: 'Fit', icon: Scan },
];

/**
 * Pure UI-rendering layer for a participant's video. It does NOT touch the
 * LiveKit connection, tracks, audio, publishing or screen-share — it only
 * decides how the existing video is displayed:
 *   • Smart Fill (default): object-fit cover, centered, no stretch.
 *   • Fit: object-fit contain (full frame) on a black backdrop.
 *   • Smart Zoom: 1.15x centered zoom.
 * Portrait/landscape is auto-detected from the real track dimensions.
 */
export const ParticipantVideo = memo(function ParticipantVideo({
  trackRef,
  label,
  micOn = true,
  isLocal = false,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  label: string;
  micOn?: boolean;
  isLocal?: boolean;
}) {
  const [mode, setMode] = useState<FitMode>('fill');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasVideo = isTrackReference(trackRef) && trackRef.participant.isCameraEnabled;
  const dims = isTrackReference(trackRef) ? trackRef.publication?.dimensions : undefined;
  const portrait = !!dims && dims.height > dims.width;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    transition: 'transform 0.25s ease, object-position 0.25s ease',
    objectFit: mode === 'fit' ? 'contain' : 'cover',
    objectPosition: 'center',
    transform: 'scale(1)',
    backgroundColor: '#000',
  };

  return (
    <div
      className="group relative h-full w-full min-h-0 overflow-hidden rounded-xl bg-black"
      data-orientation={portrait ? 'portrait' : 'landscape'}
    >
      {hasVideo ? (
        <VideoTrack trackRef={trackRef} style={videoStyle} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#141414] to-black">
          <div
            className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-lg"
            style={{ width: 'clamp(40px, 28%, 88px)', height: 'clamp(40px, 28%, 88px)', fontSize: 'clamp(16px, 9%, 34px)' }}
          >
            {label.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Name + mic state (corner) */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur-sm px-2 py-1">
        <span className="max-w-[40vw] truncate text-[12px] font-medium text-white">
          {label}
          {isLocal ? ' (You)' : ''}
        </span>
        {!micOn && <MicOff className="h-3 w-3 text-red-400" />}
      </div>

      {/* Per-tile display-mode menu (only when there's video to reshape) */}
      {hasVideo ? (
        <div ref={menuRef} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
            title="Video display mode"
            aria-label="Video display mode"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-1 w-36 rounded-lg border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl p-1 shadow-2xl">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                      mode === m.id ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
