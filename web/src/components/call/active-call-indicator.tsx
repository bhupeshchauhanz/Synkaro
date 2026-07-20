'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Phone, X, Maximize2 } from 'lucide-react';
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

/**
 * Shows a floating indicator when user is in an active call but navigated away.
 * Allows quick return to the call in fullscreen.
 */
export function ActiveCallIndicator() {
  const { user, status } = useAuthStore();
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    roomName: string;
    startedByName: string;
    waiting?: boolean;
  } | null>(null);
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
      // Already in THIS call's room — no popup needed
      if (window.location.pathname.includes(`/room/${data.roomId}/call`)) return;
      // Already in ANOTHER call → treat as "call waiting" (accepting will switch,
      // so only one live call ever runs at a time).
      const inAnotherCall = /\/room\/[^/]+\/call/.test(window.location.pathname);
      setIncomingCall({ ...data, waiting: inAnotherCall });
      stopSfx(audioRef.current);
      audioRef.current = playSfx('incoming', { loop: true });
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

  const dismissIncoming = () => {
    setIncomingCall(null);
    stopSfx(audioRef.current);
    audioRef.current = null;
  };

  // Explicit decline — tells the caller (so a couple/1:1 call hangs up instantly)
  const declineIncoming = () => {
    if (incomingCall) getSocket().emit('call:decline', { roomId: incomingCall.roomId });
    dismissIncoming();
  };

  // Auto-dismiss an unanswered incoming call after 2 minutes (stops the ring).
  useEffect(() => {
    if (!incomingCall) return;
    const t = setTimeout(() => dismissIncoming(), 120_000);
    return () => clearTimeout(t);
  }, [incomingCall]);

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

      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-6 md:p-8 max-w-md w-full text-center border border-white/[0.08]"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 animate-pulse-soft">
                <Phone className="h-7 w-7 text-success" />
              </div>
              <h2 className="font-display text-xl font-bold">
                {incomingCall.waiting ? 'Call Waiting' : 'Incoming Call'}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {incomingCall.startedByName} is calling from <strong>{incomingCall.roomName}</strong>
              </p>
              {incomingCall.waiting ? (
                <p className="mt-1 text-[11px] text-warning">
                  You&apos;re already in a call. Accepting will switch you to this one.
                </p>
              ) : null}
              <div className="mt-6 flex gap-3">
                <button onClick={declineIncoming} className="btn-ghost flex-1">
                  Decline
                </button>
                <Link
                  href={`/room/${incomingCall.roomId}/call`}
                  onClick={dismissIncoming}
                  className="btn-primary flex-1"
                >
                  <Phone className="h-4 w-4" /> Accept
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
