'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';
import { api, getApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: string;
          }) => void;
          renderButton: (element: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    const render = () => {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const res = await api.post('/auth/google', { idToken: credential });
            setUser(res.data.user);
            toast.success(`Welcome, ${res.data.user.username}`);
            router.replace('/dashboard');
          } catch (err) {
            toast.error(getApiError(err).error);
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width: containerRef.current.offsetWidth || 320,
        logo_alignment: 'left',
        text: 'continue_with',
      });
      setReady(true);
    };

    if (window.google?.accounts?.id) {
      render();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => setError(true);
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [router, setUser, clientId]);

  if (!clientId || error) {
    return (
      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-bg-input px-6 py-3 text-sm font-medium text-text-secondary opacity-60 cursor-not-allowed"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    );
  }

  return (
    <div className="relative w-full">
      <div ref={containerRef} className={`w-full ${ready ? '' : 'h-12 opacity-0'}`} />
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-input text-text-secondary text-sm font-medium pointer-events-none">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Google…
        </div>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 16.42 6.6L19.36 3.7A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.4-2.63a6.94 6.94 0 0 1-.32-4.56Z" />
      <path fill="#34A853" d="M16.04 18.0a7.0 7.0 0 0 1-10.78-3.68L1.78 17a11 11 0 0 0 19.94-1.5l-3.4-2.63a6.95 6.95 0 0 1-2.28 5.13Z" />
      <path fill="#4A90E2" d="M21.72 15.5A11 11 0 0 0 22 13a11.6 11.6 0 0 0-.18-2H12v4h5.65a4.84 4.84 0 0 1-2.1 3.18l3.4 2.63a10.7 10.7 0 0 0 2.77-5.31Z" />
      <path fill="#FBBC05" d="M5.27 9.76a6.94 6.94 0 0 0 0 4.45l-3.4 2.63A11 11 0 0 1 1 12c0-1.78.43-3.46 1.18-4.95l3.09 2.71Z" />
    </svg>
  );
}
