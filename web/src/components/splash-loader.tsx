'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_KEY = 'synkaro_splash_seen';

export function SplashLoader() {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (seen) {
      setShow(false);
      return;
    }
    setShow(true);
    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setShow(false);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
        >
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-[-20%] left-[-10%] h-[50vw] w-[50vw] rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)', filter: 'blur(80px)' }}
              animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-5">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white"
                style={{ boxShadow: '0 0 60px -12px rgba(255,255,255,0.2)' }}>
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-black" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <h1 className="font-display text-4xl font-bold tracking-[-0.04em] md:text-5xl text-white">
                Synkaro
              </h1>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.25em] text-[#666] font-medium">
                Watch together
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="relative h-[2px] w-28 overflow-hidden rounded-full bg-white/[0.06]"
            >
              <motion.div
                className="absolute inset-y-0 w-2/5 rounded-full bg-white"
                animate={{ x: ['-100%', '250%'] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
