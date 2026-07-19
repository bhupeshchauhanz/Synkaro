import Link from 'next/link';
import type { ReactNode } from 'react';
import { AuthRedirectGuard } from '@/components/auth/auth-redirect-guard';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      {/* Background mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(255,255,255,0.05), transparent 70%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(255,255,255,0.03), transparent 60%)',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Logo */}
      <div className="absolute left-6 top-6 z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-[0_0_20px_-4px_rgba(255,255,255,0.15)] transition-shadow group-hover:shadow-[0_0_28px_-4px_rgba(255,255,255,0.25)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-black" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight font-display text-white/90 group-hover:text-white transition-colors">
            Synkaro
          </span>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <AuthRedirectGuard>{children}</AuthRedirectGuard>
      </div>
    </main>
  );
}
