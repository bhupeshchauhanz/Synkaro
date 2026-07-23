'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Phone, X, Maximize2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/lib/auth-store';
import { playSfx, stopSfx, preloadSfx } from '@/lib/sfx';
import { AnimatePresence } from 'framer-motion';

interface ActiveCallInfo {
  roomId: string;
  roomName: string;
  startedByName: string;
  participantCount: number;
}

/**
 * Shows a floating indicator when user is in an active call but navigated away.
 * Allows quick return to the call in fullscreen.
 */
export function ActiveCallIndicator() {
  const { user, status } = useAuthStore();
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Incoming calls auto-redirect to fullscreen (no popup state needed)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    preloadSfx();
    const socket = getSocket();

    const onCallStarted = (data: { roomId: string; startedByName: string }) => {
      // Don't show if we're already on the call page
      if (window.location.pathname.includes(`/room/${data.roomId}/call`)) return;
      setActiveCall({
        roomId: data.roomId,
        roomName: 'Room',
        startedByName: data.startedByName,
        participantCount: 1,
      });
      setDismissed(false);
    };

    const onCallEnded = () => {
      setActiveCall(null);
    };

    const onParticipantJoined = (data: { participantCount: number }) => {
      setActiveCall((prev) => prev ? { ...prev, participantCount: data.participantCount } : null);
    };

    const onIncomingCall = (data: { roomId: string; roomName: string; startedByName: string }) => {
      // Already in THIS call's room — skip
      if (window.location.pathname.includes(`/room/${data.roomId}/call`)) return;
      // Play incoming ring for 3 seconds, then auto-redirect to call fullscreen
      stopSfx(audioRef.current);
      audioRef.current = playSfx('incoming', { loop: true });
      setTimeout(() => {
        stopSfx(audioRef.current);
        audioRef.current = null;
        window.location.href = `/room/${data.roomId}/call`;
      }, 3000);
    };

    socket.on('call:started', onCallStarted);
    socket.on('call:ended', onCallEnded);
    socket.on('call:participant-joined', onParticipantJoined);
    socket.on('call:incoming', onIncomingCall);

    return () => {
      socket.off('call:started', onCallStarted);
      socket.off('call:ended', onCallEnded);
      socket.off('call:participant-joined', onParticipantJoined);
      socket.off('call:incoming', onIncomingCall);
    };
  }, [status, user]);

  // Auto-dismiss when navigating to call page
  useEffect(() => {
    if (window.location.pathname.includes('/call')) {
      setActiveCall(null);
    }
  }, []);

  // Stop the ring if this component unmounts
  useEffect(() => () => stopSfx(audioRef.current), []);

  return (
    <>
      <AnimatePresence>
        {activeCall && !dismissed && (
          <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="rounded-2xl border border-white/[0.12] bg-bg-elevated/95 backdrop-blur-xl shadow-2xl p-3 sm:p-4 max-w-xs sm:ml-auto">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success/15 animate-pulse-soft">
                  <Phone className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">Active Call</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">
                    {activeCall.startedByName} • {activeCall.participantCount} in call
                  </p>
                </div>
                <button
                  onClick={() => setDismissed(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/room/${activeCall.roomId}/call`}
                  className="btn-primary flex-1 text-xs py-2"
                  onClick={() => setActiveCall(null)}
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Rejoin Fullscreen
                </Link>
                <Link
                  href={`/room/${activeCall.roomId}`}
                  className="btn-ghost flex-1 text-xs py-2"
                  onClick={() => setActiveCall(null)}
                >
                  View Room
                </Link>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Incoming calls auto-redirect to fullscreen — no popup needed */}
    </>
  );
}
