'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/rooms', label: 'Rooms' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useAuthStore();

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/auth/login?next=/admin');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'idle') return null;
  if (status === 'guest' || !user) return null;
  if (!user.isAdmin) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-black" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight font-display">Synkaro</span>
            <span className="badge text-[10px] ml-1">Admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-pill px-4 py-2 text-sm font-medium transition-all',
                  (item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href))
                    ? 'bg-white/[0.08] text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
