'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Plus, Users, Heart, ArrowRight } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { useAuthStore, getGreeting, isProfileComplete } from '@/lib/auth-store';
import { CreateRoomDialog } from './create-room-dialog';
import { JoinRoomDialog } from './join-room-dialog';
import { ActiveCallBanner } from './active-call-banner';
import { AppHeader } from '@/components/app-header';
import { getSocket } from '@/lib/socket';

interface RoomSummary {
  id: string;
  name: string;
  type: 'couple' | 'friend';
  inviteCode: string;
  currentTheme: string;
  members: { id: string; username: string; avatar: string | null }[];
  messageCount: number;
  hasUnseen?: boolean;
}

export function DashboardShell() {
  const router = useRouter();
  const { user, status, load } = useAuthStore();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  useEffect(() => {
    // Only redirect to login after auth check is complete (not during loading)
    if (status === 'guest') router.replace('/auth/login?next=/dashboard');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    api
      .get<RoomSummary[]>('/rooms')
      .then((res) => {
        if (!cancelled) setRooms(res.data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiError(err).error);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const socket = getSocket();

    const handleNewMessage = (msg: { roomId: string; senderId: string }) => {
      if (msg.senderId !== user?.id) {
        setRooms((prev) => {
          if (!prev) return prev;
          return prev.map((r) => {
            if (r.id === msg.roomId) {
              return { ...r, hasUnseen: true };
            }
            return r;
          });
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [status, user]);

  const onCreated = useCallback((room: RoomSummary) => {
    setRooms((prev) => (prev ? [room, ...prev] : [room]));
    router.push(`/room/${room.id}`);
  }, [router]);

  const onJoined = useCallback((roomId: string) => router.push(`/room/${roomId}`), [router]);

  // Gate room creation/joining behind a completed profile (avatar optional)
  const requireProfile = (open: () => void) => {
    if (!isProfileComplete(user)) {
      toast.message('Complete your profile first', {
        description: 'Add your bio, phone and date of birth to create or join a room.',
      });
      router.push('/profile');
      return;
    }
    open();
  };

  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 md:mb-12"
        >
          <p className="text-sm text-text-tertiary">{getGreeting()},</p>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-bold tracking-tightest lg:text-5xl">
            <span className="gradient-text">@{user.username}</span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Pick a room to keep watching together.
          </p>
        </motion.div>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button onClick={() => requireProfile(() => setCreateOpen(true))} className="btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" /> Create room
          </button>
          <button onClick={() => requireProfile(() => setJoinOpen(true))} className="btn-ghost text-xs">
            <Users className="h-3.5 w-3.5" /> Join with code
          </button>
        </div>

        {rooms && rooms.length > 0 ? (
          <ActiveCallBanner rooms={rooms.map((r) => ({ id: r.id, name: r.name }))} />
        ) : null}

        {rooms === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-lg" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="card text-center py-20">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-bg-elevated border border-white/[0.08]">
              <Heart className="h-5 w-5 text-text-secondary" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-2xl font-semibold tracking-tight">No rooms yet</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Create your first room and invite someone special.
            </p>
            <button onClick={() => requireProfile(() => setCreateOpen(true))} className="btn-primary mt-7">
              <Plus className="h-4 w-4" /> Create room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link href={`/room/${room.id}`} className="card-hover block group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
                      {room.type === 'couple' ? (
                        <Heart
                          className="h-4 w-4 text-text-primary"
                          strokeWidth={1.75}
                          fill="currentColor"
                        />
                      ) : (
                        <Users className="h-4 w-4 text-text-primary" strokeWidth={1.75} />
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
                    {room.name}
                    {room.hasUnseen && (
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-text-tertiary">{room.inviteCode}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center -space-x-2">
                      {room.members.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated border-2 border-bg-card text-[10px] font-semibold"
                        >
                          {m.username[0]?.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-text-tertiary">
                      {room.members.length} {room.members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={onCreated} />
      <JoinRoomDialog open={joinOpen} onOpenChange={setJoinOpen} onJoined={onJoined} />
    </main>
  );
}
