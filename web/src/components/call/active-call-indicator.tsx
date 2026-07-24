'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, PhoneOff, X, Maximize2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/lib/auth-store';
import { playSfx, stopSfx, preloadSfx } from '@/lib/sfx';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveCallInfo {
  roomId: string;
  roomName: string;
  startedByName: string;
  participantCount: number;
}

interface IncomingCallInfo {
  roomId: string;
  roomName: string;
  startedByName: string;
  roomType?: 'couple' | 'friend';
}

/**
 * Global call UI: shows active-call indicator when navigating away from a call,
 * and shows an accept/decline popup when another user starts a call.
 */
export function ActiveCallIndicator() {
  const router = useRouter();
  const { user, status } = useAuthStore();
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dismissIncoming = useCallback(() => {
    setIncomingCall(null);
    stopSfx(audioRef.current);
    audioRef.current = null;
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    preloadSfx();
    const socket = getSocket();

    const onCallStarted = (data: { roomId: string; startedByName: string }) => {
      if (window.location.pathname.includes(`/room/${data.roomId}/call`)) return;
      setActiveCall({
        roomId: data.roomId,
        roomName: 'Room',
        startedByName: data.startedByName,
        participantCount: 1,
      });
      setDismissed(false);
    };

    const onCallEnded = (data: { roomId: string }) => {
      setActiveCall((prev) => prev?.roomId === data.roomId ? null : prev);
      setIncomingCall((prev) => prev?.roomId === data.roomId ? null : prev);
      stopSfx(audioRef.current);
      audioRef.current = null;
    };

    const onParticipantJoined = (data: { participantCount: number }) => {
      setActiveCall((prev) => prev ? { ...prev, participantCount: data.participantCount } : null);
    };

    const onIncomingCall = (data: {
      roomId: string;
      roomName: string;
      startedByName: string;
      roomType?: 'couple' | 'friend';
    }) => {
      if (window.location.pathname.includes(`/room/${data.roomId}/call`)) return;
      stopSfx(audioRef.current);
      audioRef.current = playSfx('incoming', { loop: true });
      setIncomingCall({
        roomId: data.roomId,
        roomName: data.roomName ?? 'Room',
        startedByName: data.startedByName,
        roomType: data.roomType,
      });
    };

    const onCallDeclined = (data: { roomId: string; byName: string }) => {
      setIncomingCall((prev) => prev?.roomId === data.roomId ? null : prev);
      stopSfx(audioRef.current);
      audioRef.current = null;
    };

    socket.on('call:started', onCallStarted);
    socket.on('call:ended', onCallEnded);
    socket.on('call:participant-joined', onParticipantJoined);
    socket.on('call:incoming', onIncomingCall);
    socket.on('call:declined', onCallDeclined);

    return () => {
      socket.off('call:started', onCallStarted);
      socket.off('call:ended', onCallEnded);
      socket.off('call:participant-joined', onParticipantJoined);
      socket.off('call:incoming', onIncomingCall);
      socket.off('call:declined', onCallDeclined);
    };
  }, [status, user]);

  // Auto-dismiss active-call indicator when navigating to call page
  useEffect(() => {
    if (window.location.pathname.includes('/call')) {
      setActiveCall(null);
    }
  }, []);

  // Cleanup audio on unmount
  useEffect(() => () => {
    stopSfx(audioRef.current);
  }, []);

  const handleAcceptIncoming = useCallback(() => {
    if (!incomingCall) return;
    stopSfx(audioRef.current);
    audioRef.current = null;
    const rid = incomingCall.roomId;
    setIncomingCall(null);
    router.push(`/room/${rid}/call`);
  }, [incomingCall, router]);

  const handleDeclineIncoming = useCallback(() => {
    if (!incomingCall) return;
    stopSfx(audioRef.current);
    audioRef.current = null;
    getSocket().emit('call:decline', { roomId: incomingCall.roomId });
    setIncomingCall(null);
  }, [incomingCall]);

  return (
    <>
      {/* Incoming call popup - shown on ANY page */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl border border-white/[0.12] bg-bg-elevated/98 backdrop-blur-xl shadow-2xl p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 animate-pulse-soft">
                <Phone className="h-7 w-7 text-success" />
              </div>
              <p className="text-lg font-bold text-text-primary">{incomingCall.startedByName}</p>
              <p className="text-sm text-text-tertiary mt-1">
                Incoming call from <span className="font-medium text-text-secondary">{incomingCall.roomName}</span>
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleDeclineIncoming}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-danger/15 text-danger font-semibold py-3 text-sm hover:bg-danger/25 transition-colors"
                >
                  <PhoneOff className="h-4 w-4" /> Decline
                </button>
                <button
                  onClick={handleAcceptIncoming}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-success text-white font-semibold py-3 text-sm hover:bg-success/90 transition-colors"
                >
                  <Phone className="h-4 w-4" /> Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active call indicator - when navigated away from an ongoing call */}
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
                    {activeCall.startedByName} &bull; {activeCall.participantCount} in call
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
    </>
  );
}
