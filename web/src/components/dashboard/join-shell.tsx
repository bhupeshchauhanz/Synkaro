'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function JoinShell({ code }: { code: string }) {
  const router = useRouter();
  const { status, load } = useAuthStore();

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  useEffect(() => {
    if (status === 'guest') {
      router.replace(`/auth/login?next=/join/${code}`);
      return;
    }
    if (status !== 'authenticated') return;
    api
      .post<{ roomId: string }>('/rooms/join', { inviteCode: code })
      .then((res) => router.replace(`/room/${res.data.roomId}`))
      .catch((err) => {
        toast.error(getApiError(err).error);
        router.replace('/dashboard');
      });
  }, [code, status, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
    </main>
  );
}
