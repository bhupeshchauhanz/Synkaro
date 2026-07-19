'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export function AppHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-black" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight font-display">Synkaro</span>
        </Link>
        <div className="flex items-center gap-3">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex items-center gap-2 rounded-pill border border-white/[0.08] bg-transparent pl-1 pr-3 py-1
                  hover:bg-white/[0.06] hover:border-white/[0.14] transition-all"
                aria-label="User menu"
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black text-xs font-semibold">
                    {user.username[0]?.toUpperCase()}
                  </span>
                )}
                <span className="text-xs font-medium text-text-secondary hidden sm:inline">
                  @{user.username}
                </span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={6}
                align="end"
                className="z-50 min-w-[200px] rounded-lg border border-white/[0.1] bg-bg-elevated p-1.5 shadow-card"
              >
                <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {user.username}
                  </p>
                  <p className="text-[11px] text-text-tertiary truncate">{user.email}</p>
                </div>
                <DropdownMenu.Item asChild>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.06] outline-none cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" /> Profile
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link
                    href="/profile?tab=settings"
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.06] outline-none cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" /> Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-white/[0.06]" />
                <DropdownMenu.Item
                  onSelect={async () => {
                    await logout();
                    router.replace('/');
                  }}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 outline-none cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}
