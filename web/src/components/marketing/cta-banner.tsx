'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect, useState } from 'react';

export function CtaBanner() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <section className="relative px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-xl border border-white/[0.1] bg-bg-elevated p-12 text-center md:p-20"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.04), transparent 70%)',
          }}
        />
        <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
          Ready to <span className="gradient-text">watch together?</span>
        </h2>
        <p className="mt-5 text-base text-text-secondary md:text-lg">
          Free forever. No credit card. Get started in under a minute.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {mounted && user ? (
            <Link href="/dashboard" className="btn-primary">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/auth/signup" className="btn-primary">
                Create your room <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/login" className="btn-ghost">
                I already have an account
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </section>
  );
}
