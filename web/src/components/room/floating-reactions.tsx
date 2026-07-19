'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { FloatingReactionDto } from '@/lib/socket';

interface FloatingReaction extends FloatingReactionDto {
  id: string;
  x: number;
}

export function FloatingReactions({ reactions }: { reactions: FloatingReaction[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, scale: 0.6 }}
            animate={{ opacity: 0, y: -200, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            style={{ left: `${Math.max(5, Math.min(85, r.x))}%`, bottom: '6rem' }}
            className="absolute flex items-center gap-1.5 select-none"
          >
            <span className="text-3xl md:text-4xl drop-shadow-lg">{r.emoji}</span>
            <span className="rounded-full border border-white/10 bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white/90 max-w-[80px] truncate">
              {r.username}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
