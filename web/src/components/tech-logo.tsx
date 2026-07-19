'use client';

import { useState } from 'react';

/**
 * Renders a brand logo from the Simple Icons CDN, falling back to the first
 * letter if the icon slug doesn't exist — so we never show a broken image.
 */
export function TechLogo({ slug, color = 'ffffff', name }: { slug: string; color?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="text-sm font-bold text-white/70">{name.charAt(0)}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.simpleicons.org/${slug}/${color}`}
      alt=""
      width={22}
      height={22}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-[22px] w-[22px] object-contain"
    />
  );
}
