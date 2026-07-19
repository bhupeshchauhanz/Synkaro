'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Film } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { WatchStage } from './watch-stage';

/**
 * Room → Watch: the room library + upload only. Watching together (the synced
 * player) happens inside a call via the TV button — see the in-call Watch mode.
 */
export function WatchShell({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user, status, load } = useAuthStore();

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  useEffect(() => {
    if (status === 'guest') router.replace(`/auth/login?next=/room/${roomId}/watch`);
  }, [status, router, roomId]);

  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </main>
    );
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-bg-base">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <Link
          href={`/room/${roomId}`}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to room
        </Link>
        <span className="badge">
          <Film className="h-3 w-3" /> Room library
        </span>
      </header>
      <div className="flex-1 overflow-hidden">
        <WatchStage roomId={roomId} currentUsername={user.username} libraryOnly />
      </div>
    </main>
  );
}
