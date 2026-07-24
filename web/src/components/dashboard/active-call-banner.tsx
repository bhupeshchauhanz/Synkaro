'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket, type CallStartedDto } from '@/lib/socket';

interface ActiveCall {
  roomId: string;
  roomName: string;
  startedByName: string;
}

export function ActiveCallBanner({
  rooms,
}: {
  rooms: { id: string; name: string }[];
}) {
  const [active, setActive] = useState<ActiveCall[]>([]);

  // Initial probe of all rooms — slim
  useEffect(() => {
    if (rooms.length === 0) return;
    let cancelled = false;
    const fetchAll = async () => {
      const probes = await Promise.allSettled(
        rooms.map((r) =>
          api
            .get<{ active: boolean; startedByName?: string }>(`/rooms/${r.id}/call/active`)
            .then((res) => ({ roomId: r.id, roomName: r.name, ...res.data })),
        ),
      );
      if (cancelled) return;
      const found = probes
        .filter(
          (p): p is PromiseFulfilledResult<{
            roomId: string;
            roomName: string;
            active: boolean;
            startedByName?: string;
          }> => p.status === 'fulfilled',
        )
        .map((p) => p.value)
        .filter((p) => p.active && p.startedByName)
        .map<ActiveCall>((p) => ({
          roomId: p.roomId,
          roomName: p.roomName,
          startedByName: p.startedByName!,
        }));
      setActive(found);
    };
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [rooms]);

  // Live updates — listen on each room channel
  useEffect(() => {
    if (rooms.length === 0) return;
    const socket = getSocket();
    const subscribe = () => {
      for (const r of rooms) socket.emit('room:join', { roomId: r.id });
    };
    if (socket.connected) subscribe();
    socket.on('connect', subscribe);

    const onStarted = (e: CallStartedDto) => {
      const room = rooms.find((r) => r.id === e.roomId);
      if (!room) return;
      setActive((prev) => {
        if (prev.find((a) => a.roomId === e.roomId)) return prev;
        return [
          ...prev,
          { roomId: e.roomId, roomName: room.name, startedByName: e.startedByName },
        ];
      });
    };
    const onEnded = (payload: { roomId?: string }) => {
      if (payload?.roomId) {
        setActive((prev) => prev.filter((a) => a.roomId !== payload.roomId));
      }
    };

    socket.on('call:started', onStarted);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('connect', subscribe);
      socket.off('call:started', onStarted);
      socket.off('call:ended', onEnded);
    };
  }, [rooms]);

  return (
    <AnimatePresence>
      {active.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-6 space-y-2"
        >
          {active.map((call) => (
            <Link
              key={call.roomId}
              href={`/room/${call.roomId}/call`}
              className="group flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-5 py-4 transition-all hover:border-success/60 hover:bg-success/10"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
                  <Phone className="h-4 w-4 text-success" />
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-success animate-pulse-soft ring-2 ring-bg-base" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">
                    Call going on in <span className="text-success">{call.roomName}</span>
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Started by {call.startedByName} · Tap to join now
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-success transition-colors" />
            </Link>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
