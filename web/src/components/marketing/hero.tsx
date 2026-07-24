'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export function Hero() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <section className="relative isolate flex min-h-[92vh] items-center justify-center overflow-hidden px-6 pt-32 pb-20 md:pt-36">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.06), transparent 60%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent -z-10" />

      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-5 py-2.5 backdrop-blur-md"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-sm font-semibold text-white">Free for everyone</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-sm text-text-secondary">No credit card needed</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-[3.25rem] leading-[1.05] tracking-tightest font-bold md:text-7xl lg:text-[5.5rem]"
        >
          Watch movies together
          <br />
          <span className="gradient-text">in perfect sync.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl"
        >
          The watch-together platform for couples and close friends.
          Frame-perfect sync, HD calls, and a chat that lives next to your video.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href={mounted && user ? "/dashboard" : "/auth/signup"} className="btn-primary">
            {mounted && user ? "Go to Dashboard" : "Start watching together"} <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how-it-works" className="btn-ghost">
            <Play className="h-3.5 w-3.5" /> See how it works
          </a>
        </motion.div>

        {/* Mock product screenshot removed as per request */}
      </div>
    </section>
  );
}
