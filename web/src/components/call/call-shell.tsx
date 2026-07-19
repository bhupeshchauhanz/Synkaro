'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mic, Video, Camera, AlertCircle, Phone } from 'lucide-react';
import { api, getApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';
import { CallRoom } from './call-room';

type PermissionStage = 'idle' | 'requesting' | 'granted' | 'denied';

export function CallShell({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user, status, load } = useAuthStore();
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionStage>('idle');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [enableVideo, setEnableVideo] = useState(true);
  const [enableAudio, setEnableAudio] = useState(true);
  const autoJoinTried = useRef(false);

  // Restore the user's last camera/mic choice
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = localStorage.getItem('synkaro:call:video');
    const a = localStorage.getItem('synkaro:call:audio');
    if (v !== null) setEnableVideo(v === 'true');
    if (a !== null) setEnableAudio(a === 'true');
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('synkaro:call:video', String(enableVideo));
  }, [enableVideo]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('synkaro:call:audio', String(enableAudio));
  }, [enableAudio]);
  const [activeCall, setActiveCall] = useState<{
    active: boolean;
    startedByName?: string;
    participantCount?: number;
  } | null>(null);
  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  useEffect(() => {
    if (status === 'guest') router.replace(`/auth/login?next=/room/${roomId}/call`);
  }, [status, router, roomId]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    api
      .get<{ active: boolean; startedByName?: string; participantCount?: number }>(
        `/rooms/${roomId}/call/active`,
      )
      .then((res) => {
        if (!cancelled) setActiveCall(res.data);
      })
      .catch(() => {
        if (!cancelled) setActiveCall({ active: false });
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, status]);

  // Ensure this client is in the room channel (incoming-call UI is handled
  // globally by <ActiveCallIndicator/>; we don't duplicate it here to avoid
  // two overlapping modals and two ringtones playing at once).
  useEffect(() => {
    if (status !== 'authenticated') return;
    getSocket().emit('room:join', { roomId });
  }, [roomId, status]);

  // If camera + mic permission was already granted before, skip the pre-join
  // screen entirely and connect straight away (no repeat browser prompt).
  useEffect(() => {
    if (status !== 'authenticated' || autoJoinTried.current) return;
    autoJoinTried.current = true;
    void (async () => {
      try {
        const perms = (navigator as unknown as { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } }).permissions;
        if (!perms?.query) return;
        const [cam, mic] = await Promise.all([
          perms.query({ name: 'camera' }).catch(() => null),
          perms.query({ name: 'microphone' }).catch(() => null),
        ]);
        if (cam?.state === 'granted' && mic?.state === 'granted') {
          void requestPermissions();
        }
      } catch {
        /* Permissions API unsupported — fall back to the manual gate */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const requestPermissions = async () => {
    setPermission('requesting');
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: enableAudio,
        video: enableVideo,
      });
      // Stop the test stream — LiveKit will request its own
      stream.getTracks().forEach((t) => t.stop());

      // Now fetch LiveKit token
      const res = await api.get<{ token: string; url: string }>(
        `/rooms/${roomId}/call/token`,
      );
      setToken(res.data.token);
      setServerUrl(res.data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL || '');
      setPermission('granted');
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setPermissionError(
            'Camera/microphone access was blocked. Please allow access in your browser settings and try again.',
          );
        } else if (err.name === 'NotFoundError') {
          setPermissionError(
            'No camera or microphone found. Please connect a device and try again.',
          );
        } else {
          setPermissionError(err.message);
        }
      } else {
        setPermissionError(getApiError(err).error);
      }
      setPermission('denied');
    }
  };

  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </main>
    );
  }

  if (permission === 'granted' && token && serverUrl) {
    return (
      <CallRoom
        roomId={roomId}
        token={token}
        serverUrl={serverUrl}
        enableVideo={enableVideo}
        enableAudio={enableAudio}
        onLeave={() => router.replace(`/room/${roomId}`)}
      />
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 sm:px-6 py-8 sm:py-12">
      <div className="mesh-bg pointer-events-none absolute inset-0 -z-10 opacity-30" />
      <div className="absolute left-4 sm:left-6 top-4 sm:top-6">
        <Link
          href={`/room/${roomId}`}
          className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to room
        </Link>
      </div>
      <div className="w-full max-w-lg">
        <div className="card p-5 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
              {activeCall?.active ? (
                <Phone className="h-5 w-5 text-success animate-pulse-soft" strokeWidth={1.75} />
              ) : (
                <Camera className="h-5 w-5 text-white" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {activeCall?.active ? 'Join active call' : 'Start a call'}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {activeCall?.active && activeCall.startedByName
                  ? `${activeCall.startedByName} is waiting. ${activeCall.participantCount ?? 1} in call.`
                  : 'Choose your camera and mic settings before joining.'}
              </p>
            </div>
          </div>

          {/* Device toggles */}
          <div className="space-y-2">
            <label
              className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                enableVideo
                  ? 'border-white/30 bg-white/5'
                  : 'border-white/[0.08] bg-bg-input'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  enableVideo ? 'bg-white/15' : 'bg-bg-elevated'
                }`}>
                  <Video className={`h-4 w-4 ${enableVideo ? 'text-white' : 'text-text-tertiary'}`} />
                </div>
                <div>
                  <span className="text-sm font-medium">Camera</span>
                  <p className="text-[11px] text-text-tertiary">
                    {enableVideo ? 'Will be on when you join' : 'Off — you can turn it on later'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableVideo}
                onChange={(e) => setEnableVideo(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 accent-white"
              />
            </label>
            <label
              className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                enableAudio
                  ? 'border-white/30 bg-white/5'
                  : 'border-white/[0.08] bg-bg-input'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  enableAudio ? 'bg-white/15' : 'bg-bg-elevated'
                }`}>
                  <Mic className={`h-4 w-4 ${enableAudio ? 'text-white' : 'text-text-tertiary'}`} />
                </div>
                <div>
                  <span className="text-sm font-medium">Microphone</span>
                  <p className="text-[11px] text-text-tertiary">
                    {enableAudio ? 'Will be on when you join' : 'Off — you can unmute later'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableAudio}
                onChange={(e) => setEnableAudio(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 accent-white"
              />
            </label>
          </div>

          {permissionError ? (
            <div className="mt-5 flex gap-2.5 rounded-xl border border-danger/30 bg-danger/5 p-4">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-danger mt-0.5" />
              <div>
                <p className="text-xs font-medium text-danger mb-0.5">Permission denied</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">{permissionError}</p>
              </div>
            </div>
          ) : null}

          <button
            onClick={requestPermissions}
            disabled={permission === 'requesting' || (!enableAudio && !enableVideo)}
            className="btn-primary mt-6 w-full py-3.5"
          >
            {permission === 'requesting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
              </>
            ) : activeCall?.active ? (
              <>
                <Phone className="h-4 w-4" /> Join call now
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" /> Allow & join call
              </>
            )}
          </button>

          {!enableAudio && !enableVideo ? (
            <p className="mt-3 text-center text-[11px] text-warning">
              Enable at least one device to join the call.
            </p>
          ) : (
            <p className="mt-3 text-center text-[11px] text-text-tertiary">
              Your browser will ask for permission. Click "Allow".
            </p>
          )}
        </div>
      </div>

    </main>
  );
}
