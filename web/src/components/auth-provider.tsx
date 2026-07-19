'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';

/**
 * Initializes auth state on app load.
 * Checks for existing session cookie and loads user data.
 * This prevents repeated login prompts after initial authentication.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { status, load } = useAuthStore();

  useEffect(() => {
    if (status === 'idle') {
      load();
    }
  }, [status, load]);

  // Presence heartbeat — keeps the server's "online" status fresh so call
  // gating (couple/friend online checks) works. Fires on connect and every 45s.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const socket = getSocket();
    const beat = () => socket.emit('presence:update', { status: 'online' });

    if (socket.connected) beat();
    socket.on('connect', beat);
    const interval = setInterval(beat, 45_000);

    const onVisibility = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      socket.off('connect', beat);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [status]);

  return <>{children}</>;
}
