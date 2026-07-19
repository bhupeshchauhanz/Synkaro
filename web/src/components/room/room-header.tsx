'use client';

import Link from 'next/link';
import {
  Copy,
  Check,
  Phone,
  Tv,
  ArrowLeft,
  Heart,
  Users,
  Settings,
  MoreVertical,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import { toast } from '@/lib/toast';

interface Member {
  id: string;
  username: string;
  avatar: string | null;
}

export function RoomHeader({
  roomId,
  name,
  nickname,
  type,
  inviteCode,
  members,
  onOpenSettings,
}: {
  roomId: string;
  name: string;
  nickname: string | null;
  type: 'couple' | 'friend';
  inviteCode: string;
  members: Member[];
  onOpenSettings: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}/join/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Invite link copied');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="flex items-center justify-between border-b border-white/[0.06] bg-black/70 backdrop-blur-2xl px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-white/[0.04] transition-all"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-8 w-8 md:h-9 md:w-9 flex-shrink-0 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
          {type === 'couple' ? (
            <Heart className="h-3.5 w-3.5 text-text-primary" fill="currentColor" strokeWidth={1.75} />
          ) : (
            <Users className="h-3.5 w-3.5 text-text-primary" strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight max-w-[120px] md:max-w-none">
            {nickname || name}
          </h1>
          <p className="text-[10px] md:text-[11px] text-text-tertiary">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        <Link href={`/room/${roomId}/watch`} className="btn-ghost text-xs px-3.5 py-2">
          <Tv className="h-3.5 w-3.5" /> Watch
        </Link>
        <Link href={`/room/${roomId}/call`} className="btn-ghost text-xs px-3.5 py-2">
          <Phone className="h-3.5 w-3.5" /> Call
        </Link>
        <button
          onClick={copy}
          className="btn-ghost text-xs px-3.5 py-2 font-mono"
          title="Copy invite link"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {inviteCode}
        </button>
        <button
          onClick={onOpenSettings}
          className="flex h-9 w-9 items-center justify-center rounded-pill border border-white/[0.08] bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.06] hover:border-white/[0.14] transition-all"
          aria-label="Room settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile actions */}
      <div className="flex md:hidden items-center gap-1.5">
        <Link
          href={`/room/${roomId}/watch`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all"
          aria-label="Watch together"
        >
          <Tv className="h-4 w-4" />
        </Link>
        <Link
          href={`/room/${roomId}/call`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all"
          aria-label="Call"
        >
          <Phone className="h-4 w-4" />
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={6}
              align="end"
              className="z-50 min-w-[180px] rounded-lg border border-white/[0.1] bg-bg-elevated p-1.5 shadow-card"
            >
              <DropdownMenu.Item
                onSelect={copy}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.06] outline-none cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                Copy invite ({inviteCode})
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={onOpenSettings}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.06] outline-none cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" /> Room settings
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
