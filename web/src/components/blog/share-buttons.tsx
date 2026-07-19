'use client';

import { useState } from 'react';
import { Twitter, Link as LinkIcon, MessageCircle, Check } from 'lucide-react';
import { toast } from '@/lib/toast';

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title,
  )}&url=${encodeURIComponent(url)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={tweet}
        target="_blank"
        rel="noreferrer"
        className="btn-pill border border-border bg-white/[0.02] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]"
      >
        <Twitter className="h-3.5 w-3.5" /> Tweet
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="btn-pill border border-border bg-white/[0.02] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]"
      >
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </a>
      <button
        onClick={copy}
        className="btn-pill border border-border bg-white/[0.02] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-success" /> Copied
          </>
        ) : (
          <>
            <LinkIcon className="h-3.5 w-3.5" /> Copy link
          </>
        )}
      </button>
    </div>
  );
}
