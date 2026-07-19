'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/lib/auth-store';
import { playSfx } from '@/lib/sfx';
import { toast } from '@/lib/toast';

interface IncomingMessage {
  id: string;
  roomId: string;
  senderId: string;
  username: string;
  content: string | null;
  type: string;
  metadata?: { callRecord?: boolean } | null;
}

/**
 * App-wide message notifications. Because the server only broadcasts
 * `message:new` to sockets that are members of the room, every event we receive
 * here is already for one of the current user's rooms — so we can safely notify.
 *
 * Rules:
 *  - Never notify for your own messages.
 *  - If you're actively looking at that room (tab focused), stay silent.
 *  - Otherwise: play the notification sound + browser notification + a toast.
 *  - Respect the per-room mute toggle stored in localStorage.
 */
export function GlobalNotifications() {
  const { user, status } = useAuthStore();
  const pathname = usePathname();
  const lastSoundAt = useRef(0);

  // Ask for browser-notification permission once, app-wide (so notifications
  // work even for users who only sit on the dashboard).
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    const socket = getSocket();

    const onMessage = (m: IncomingMessage) => {
      if (!m || m.senderId === user.id) return;
      // Don't notify for system call-record messages ("📞 Call ended …")
      if (m.metadata?.callRecord) return;

      const viewingThisRoom = pathname?.includes(`/room/${m.roomId}`) ?? false;
      if (viewingThisRoom && !document.hidden) return; // actively watching this room

      const muted =
        typeof window !== 'undefined' &&
        localStorage.getItem(`synkaro:mute:${m.roomId}`) === 'true';
      if (muted) return;

      const preview =
        m.type === 'image' ? '📷 Sent a photo' : m.content || 'New message';

      // Throttle the sound so a burst of messages doesn't machine-gun the speaker
      const now = Date.now();
      if (now - lastSoundAt.current > 2500) {
        lastSoundAt.current = now;
        playSfx('notification', { volume: 0.5 });
      }

      // Browser notification when the tab isn't focused
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        try {
          const n = new Notification(`New message from ${m.username}`, {
            body: preview,
            icon: '/favicon.svg',
            tag: `msg-${m.roomId}`,
          });
          n.onclick = () => {
            window.focus();
            window.location.href = `/room/${m.roomId}`;
          };
        } catch {
          /* noop */
        }
      }

      // In-app toast (e.g. when sitting on the dashboard or another room)
      toast.message(`${m.username}`, { description: preview });
    };

    socket.on('message:new', onMessage);
    return () => {
      socket.off('message:new', onMessage);
    };
  }, [status, user, pathname]);

  return null;
}
