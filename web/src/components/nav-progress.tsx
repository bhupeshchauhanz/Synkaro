'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Top-of-page progress bar that animates on every route transition.
 * Listens to pathname/searchParams changes via Next router and animates
 * a thin gradient bar across the top of the viewport.
 */
function NavProgressInner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const t = setTimeout(() => setActive(false), 700);
    return () => clearTimeout(t);
  }, [pathname, search]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="navprogress"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.65, ease: [0.65, 0, 0.35, 1] }}
          style={{ transformOrigin: 'left' }}
          className="fixed left-0 right-0 top-0 z-[200] h-[2px] bg-white"
        />
      ) : null}
    </AnimatePresence>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <NavProgressInner />
    </Suspense>
  );
}
