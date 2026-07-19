'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

const links = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'fixed top-0 z-50 w-full transition-all duration-300 ease-out',
          scrolled
            ? 'bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-black" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight font-display">Synkaro</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-pill px-4 py-2 text-sm font-medium text-text-secondary
                  hover:text-text-primary hover:bg-white/[0.04] transition-all"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {mounted && user ? (
              <Link href="/dashboard" className="btn-primary text-xs px-5 py-2">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex btn-pill text-text-secondary hover:text-text-primary"
                >
                  Log in
                </Link>
                <Link href="/auth/signup" className="btn-primary text-xs px-5 py-2">
                  Get started
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileOpen((s) => !s)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:text-text-primary md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[60px] z-40 border-b border-white/[0.06] bg-black/95 backdrop-blur-2xl px-6 py-4 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2 border-t border-white/[0.06] pt-3">
                {mounted && user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="btn-primary flex-1 text-xs text-center"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileOpen(false)}
                      className="btn-ghost flex-1 text-xs text-center"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setMobileOpen(false)}
                      className="btn-primary flex-1 text-xs text-center"
                    >
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
