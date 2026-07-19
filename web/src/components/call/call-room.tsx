'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LiveKitRoom,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useConnectionState,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track, ConnectionState, RoomEvent, VideoPresets, ConnectionQuality, ParticipantEvent } from 'livekit-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Tv, Users, Clock,
  AlertCircle, Loader2, Volume2, Pin, PinOff,
} from 'lucide-react';
import '@livekit/components-styles';
import { getSocket } from '@/lib/socket';
import { playSfx, stopSfx } from '@/lib/sfx';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { WatchChat } from '@/components/watch/watch-chat';
import { WatchStage } from '@/components/watch/watch-stage';
import { ParticipantVideo } from './participant-video';

interface Props {
  roomId: string;
  token: string;
  serverUrl: string;
  enableVideo: boolean;
  enableAudio: boolean;
  onLeave: () => void;
}

const WAIT_ALONE_SECONDS = 300;

export function CallRoom({ roomId, token, serverUrl, enableVideo, enableAudio, onLeave }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('call:join', { roomId });
    if (socket.connected) join();
    socket.on('connect', join);
    const onEnded = (p: { roomId?: string }) => {
      if (!p?.roomId || p.roomId === roomId) onLeave();
    };
    const onDeclined = (p: { byName?: string }) => {
      if (p?.byName) toast.message(`${p.byName} declined the call`);
    };
    socket.on('call:ended', onEnded);
    socket.on('call:declined', onDeclined);
    return () => {
      socket.off('connect', join);
      socket.off('call:ended', onEnded);
      socket.off('call:declined', onDeclined);
      socket.emit('call:leave', { roomId });
    };
  }, [roomId, onLeave]);

  if (error) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black px-6">
        <div className="bg-[#111] border border-white/10 rounded-2xl max-w-md text-center p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Could not connect</h2>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <button onClick={onLeave} className="mt-5 px-4 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5">Back to room</button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-black" data-lk-theme="default">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio={false}
        video={false}
        options={{ adaptiveStream: true, dynacast: true }}
        onDisconnected={() => undefined}
        onError={(err) => {
          const msg = err?.message ?? 'Unknown LiveKit error';
          if (msg.includes('publish track when not connected')) return;
          setError(msg);
        }}
        className="h-full w-full"
      >
        <CallLayout roomId={roomId} onLeave={onLeave} initialAudio={enableAudio} initialVideo={enableVideo} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function CallLayout({ roomId, onLeave, initialAudio, initialVideo }: {
  roomId: string; onLeave: () => void; initialAudio: boolean; initialVideo: boolean;
}) {
  const { user } = useAuthStore();
  const [watchMode, setWatchMode] = useState(false);
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ], { onlySubscribed: false });

  const remoteTracks = tracks.filter((t) => !t.participant.isLocal);
  const localTrack = tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera);

  const [partnerName, setPartnerName] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    api.get<{ type: string; members: { id: string; username: string; nickname: string | null }[] }>(`/rooms/${roomId}`)
      .then((res) => {
        if (cancelled) return;
        const others = res.data.members.filter((m) => m.id !== user?.id);
        if (res.data.type === 'couple' && others[0]) {
          setPartnerName(others[0].nickname || others[0].username);
        } else if (others.length > 0) {
          setPartnerName(others.length === 1 ? (others[0].nickname || others[0].username) : `${others.length} friends`);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [roomId, user?.id]);

  const publishedRef = useRef(false);
  useEffect(() => {
    if (publishedRef.current) return;
    if (connectionState !== ConnectionState.Connected) return;
    publishedRef.current = true;
    void (async () => {
      try {
        if (initialAudio) await room.localParticipant.setMicrophoneEnabled(true);
        if (initialVideo) await room.localParticipant.setCameraEnabled(true, { resolution: VideoPresets.h720 });
      } catch {}
    })();
  }, [connectionState, room, initialAudio, initialVideo]);

  useEffect(() => {
    const onMediaErr = (err: Error) => console.warn('[Call] Media error:', err.message);
    const onParticipantDisconnected = () => playSfx('left');
    const onDataReceived = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'airhorn') playSfx('airhorn');
        else if (data.type === 'video-off-neterr') {
          toast.message(`${data.name}'s video turned off`, {
            description: 'Weak network — their camera was turned off to keep the call smooth.',
          });
        }
      } catch {}
    };
    room.on(RoomEvent.MediaDevicesError, onMediaErr);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.MediaDevicesError, onMediaErr);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room]);

  useEffect(() => {
    const lp = room.localParticipant;
    let poorTimer: ReturnType<typeof setTimeout> | null = null;
    let autoOff = false;
    const onQuality = (quality: ConnectionQuality) => {
      const poor = quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;
      if (poor) {
        if (poorTimer || !lp.isCameraEnabled) return;
        poorTimer = setTimeout(() => {
          poorTimer = null;
          if (lp.isCameraEnabled) {
            autoOff = true;
            void lp.setCameraEnabled(false);
            toast.message('Camera turned off', { description: 'Weak network — camera off so audio stays clear.' });
            try {
              const payload = new TextEncoder().encode(JSON.stringify({ type: 'video-off-neterr', name: lp.name || 'A participant' }));
              void lp.publishData(payload, { reliable: true });
            } catch {}
          }
        }, 10000);
      } else {
        if (poorTimer) { clearTimeout(poorTimer); poorTimer = null; }
        if (autoOff && !lp.isCameraEnabled) {
          autoOff = false;
          toast.success('Network recovered — you can turn your camera back on.');
        }
      }
    };
    lp.on(ParticipantEvent.ConnectionQualityChanged, onQuality);
    return () => { lp.off(ParticipantEvent.ConnectionQualityChanged, onQuality); if (poorTimer) clearTimeout(poorTimer); };
  }, [room]);

  const alone = participants.length <= 1;
  const connecting = connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting;

  const [secondsLeft, setSecondsLeft] = useState(WAIT_ALONE_SECONDS);
  useEffect(() => {
    if (!alone) { setSecondsLeft(WAIT_ALONE_SECONDS); return; }
    if (secondsLeft <= 0) { onLeave(); return; }
    const t = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [alone, secondsLeft, onLeave]);

  const ringRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (alone && !connecting) {
      if (!ringRef.current) ringRef.current = playSfx('outgoing', { loop: true });
    } else if (ringRef.current) {
      stopSfx(ringRef.current);
      ringRef.current = null;
    }
    return () => { stopSfx(ringRef.current); ringRef.current = null; };
  }, [alone, connecting]);

  useEffect(() => {
    const socket = getSocket();
    const onOpened = () => setWatchMode(true);
    const onClosed = () => setWatchMode(false);
    socket.on('watch:opened', onOpened);
    socket.on('watch:closed', onClosed);
    return () => { socket.off('watch:opened', onOpened); socket.off('watch:closed', onClosed); };
  }, []);
  const openWatch = () => getSocket().emit('watch:open', { roomId });
  const closeWatch = () => getSocket().emit('watch:close', { roomId });

  const isGroup = remoteTracks.length > 1;

  // ── Watch-together mode ──
  if (watchMode) {
    return (
      <div className="flex h-full w-full flex-col md:flex-row overflow-hidden">
        <section className="h-[50%] md:h-full md:w-[70%] overflow-hidden bg-black">
          <WatchStage roomId={roomId} currentUsername={user?.username ?? ''} />
        </section>
        <aside className="flex h-[50%] md:h-full md:w-[30%] min-w-0 flex-col border-t border-white/10 md:border-l md:border-t-0 bg-[#0a0a0a] overflow-hidden">
          {/* Tiles — horizontal scroll for group, single for couple */}
          <div className="shrink-0 border-b border-white/10 p-1.5 overflow-hidden" style={{ maxHeight: '35%' }}>
            <div className={isGroup ? 'flex gap-1.5 overflow-x-auto pb-1' : 'flex flex-col gap-1.5'}>
              <div className={isGroup ? 'w-20 md:w-24 shrink-0 aspect-video' : 'w-full aspect-video'}>
                <SelfTile trackRef={localTrack} label={user?.username ?? 'You'} />
              </div>
              {remoteTracks.map((t) => (
                <div key={`${t.participant.identity}-${t.source}`} className={isGroup ? 'w-20 md:w-24 shrink-0 aspect-video' : 'w-full aspect-video'}>
                  <Tile trackRef={t} label={t.participant.name || t.participant.identity} />
                </div>
              ))}
            </div>
          </div>
          <div className="shrink-0 border-b border-white/10 py-1.5 flex justify-center">
            <CallControls onLeave={onLeave} inline watchActive onToggleWatch={closeWatch} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {user ? <WatchChat roomId={roomId} currentUserId={user.id} /> : null}
          </div>
        </aside>
      </div>
    );
  }

  // ── Normal call mode ──
  return (
    <div className="flex h-full w-full flex-col md:flex-row overflow-hidden">
      {/* Main — remote participants + controls */}
      <section className="relative flex h-[55%] md:h-full md:w-[70%] flex-col overflow-hidden bg-black">
        <div className="flex-1 min-h-0 overflow-hidden p-2 md:p-3">
          {connecting ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mb-3" />
              <h2 className="text-lg font-semibold text-white">Connecting…</h2>
            </div>
          ) : remoteTracks.length === 0 ? (
            <WaitingStage partnerName={partnerName} secondsLeft={secondsLeft} />
          ) : (
            <RemoteGrid tracks={remoteTracks} />
          )}
        </div>
        <CallControls onLeave={onLeave} onToggleWatch={openWatch} />
      </section>

      {/* Sidebar — self tile + chat */}
      <aside className="flex h-[45%] md:h-full md:w-[30%] min-w-0 flex-col border-t border-white/10 md:border-l md:border-t-0 bg-[#0a0a0a] overflow-hidden">
        <div className="shrink-0 border-b border-white/10 p-2" style={{ maxHeight: '40%' }}>
          <SelfTile trackRef={localTrack} label={user?.username ?? 'You'} />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {user ? <WatchChat roomId={roomId} currentUserId={user.id} /> : null}
        </div>
      </aside>
    </div>
  );
}

function WaitingStage({ partnerName, secondsLeft }: { partnerName: string; secondsLeft: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-6">
      <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-white/10 border border-white/20 mb-5 animate-pulse-soft">
        <Users className="h-6 w-6 md:h-7 md:w-7 text-white/60" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-white">
        {partnerName ? `Waiting for ${partnerName}` : 'Waiting for others'}
      </h2>
      <p className="mt-2 text-xs md:text-sm text-white/50">They'll get a ring and a notification to join.</p>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5">
        <Clock className="h-3.5 w-3.5 text-white/60" />
        <span className="font-mono text-sm text-white/70">
          {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

/**
 * Responsive grid that fits ALL participants within the 70% area.
 * - 1 person: full area
 * - 2 people: 2 columns
 * - 3-4 people: 2x2 grid
 * - 5-6 people: 3x2 grid (3 columns, 2 rows)
 */
function RemoteGrid({ tracks }: { tracks: TrackReferenceOrPlaceholder[] }) {
  const [pinned, setPinned] = useState<string | null>(null);
  const n = tracks.length;

  const gridClass = useMemo(() => {
    if (n <= 1) return 'grid-cols-1 grid-rows-1';
    if (n === 2) return 'grid-cols-2 grid-rows-1';
    if (n <= 4) return 'grid-cols-2 grid-rows-2';
    return 'grid-cols-3 grid-rows-2'; // 5+ people: 3 columns, wraps to rows
  }, [n]);

  // Clear pin when the pinned participant leaves the call
  useEffect(() => {
    if (pinned && !tracks.find((t) => t.participant.identity === pinned)) {
      setPinned(null);
    }
  }, [tracks, pinned]);

  const cell = (t: TrackReferenceOrPlaceholder) => {
    const id = t.participant.identity;
    const isPinned = pinned === id;
    return (
      <div key={`${id}-${t.source}`} className="group/pin relative h-full w-full min-h-0 min-w-0 overflow-hidden">
        <Tile trackRef={t} label={t.participant.name || t.participant.identity} />
        {n > 1 ? (
          <button
            onClick={() => setPinned(isPinned ? null : id)}
            title={isPinned ? 'Unpin' : 'Pin'}
            className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white/80 opacity-0 transition-opacity hover:bg-black/80 hover:text-white group-hover/pin:opacity-100"
          >
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    );
  };

  // Pinned layout: one big + strip of others
  const pinnedTrack = pinned ? tracks.find((t) => t.participant.identity === pinned) : null;
  if (pinnedTrack && n > 1) {
    const others = tracks.filter((t) => t.participant.identity !== pinned);
    return (
      <div className="flex h-full w-full flex-col gap-1.5 overflow-hidden">
        <div className="min-h-0 flex-1">{cell(pinnedTrack)}</div>
        <div className="flex h-16 md:h-20 shrink-0 gap-1.5 overflow-x-auto">
          {others.map((t) => (
            <div key={`${t.participant.identity}-${t.source}`} className="aspect-video h-full shrink-0">
              {cell(t)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid h-full w-full gap-1.5 auto-rows-fr ${gridClass} overflow-hidden`}>
      {tracks.map(cell)}
    </div>
  );
}

function Tile({ trackRef, label }: { trackRef: TrackReferenceOrPlaceholder; label: string }) {
  return (
    <ParticipantVideo
      trackRef={trackRef}
      label={label}
      micOn={trackRef.participant.isMicrophoneEnabled}
      isLocal={trackRef.participant.isLocal}
    />
  );
}

function SelfTile({ trackRef, label }: { trackRef: TrackReferenceOrPlaceholder | undefined; label: string }) {
  const { microphoneTrack } = useLocalParticipant();
  const micEnabled = !!microphoneTrack && !microphoneTrack.isMuted;
  if (!trackRef) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-bold text-white">
          {label.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }
  return (
    <div className="aspect-video w-full">
      <ParticipantVideo trackRef={trackRef} label={label} micOn={micEnabled} isLocal />
    </div>
  );
}

function CallControls({ onLeave, onToggleWatch, watchActive, inline }: {
  onLeave: () => void;
  onToggleWatch?: () => void;
  watchActive?: boolean;
  inline?: boolean;
}) {
  const { localParticipant, microphoneTrack, cameraTrack } = useLocalParticipant();
  const micEnabled = !!microphoneTrack && !microphoneTrack.isMuted;
  const camEnabled = !!cameraTrack && !cameraTrack.isMuted;
  const connectionState = useConnectionState();
  const isConnected = connectionState === ConnectionState.Connected;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastAirhorn = useRef(0);
  const [airhornCooldown, setAirhornCooldown] = useState(false);

  const playAirhorn = async () => {
    const now = Date.now();
    if (now - lastAirhorn.current < 3000) return;
    lastAirhorn.current = now;
    setAirhornCooldown(true);
    setTimeout(() => setAirhornCooldown(false), 3000);
    stopSfx(audioRef.current);
    audioRef.current = playSfx('airhorn');
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'airhorn' }));
      await localParticipant.publishData(payload, { reliable: true });
    } catch {}
  };

  const wrapperClass = inline
    ? 'flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1a1a1a]/90 backdrop-blur-xl px-2 py-1 shadow-2xl'
    : 'absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1a1a1a]/90 backdrop-blur-xl px-2.5 py-1.5 shadow-2xl z-10 max-w-[calc(100vw-16px)]';

  return (
    <div className={wrapperClass}>
      <CB active={micEnabled} disabled={!isConnected} onClick={() => { if (!isConnected) return; if (!micEnabled) playSfx('unmute'); void localParticipant.setMicrophoneEnabled(!micEnabled); }}>
        {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </CB>
      <CB active={camEnabled} disabled={!isConnected} onClick={() => { if (!isConnected) return; if (!camEnabled) playSfx('unmute'); void localParticipant.setCameraEnabled(!camEnabled, { resolution: VideoPresets.h720 }); }}>
        {camEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </CB>
      <div className="mx-0.5 h-5 w-px bg-white/10" />
      <button onClick={onToggleWatch} title={watchActive ? 'Back to call' : 'Watch together'}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${watchActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
        <Tv className="h-3.5 w-3.5" />
      </button>
      <button onClick={playAirhorn} disabled={airhornCooldown} title="Airhorn"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30">
        <Volume2 className="h-3.5 w-3.5" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-white/10" />
      <button onClick={onLeave} title="Leave call"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b30000] text-white hover:bg-[#900] transition-colors">
        <PhoneOff className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CB({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
      }`}>
      {children}
    </button>
  );
}
