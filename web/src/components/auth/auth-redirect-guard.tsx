'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Redirects authenticated users away from auth pages (login, signup, etc.)
 * back to the dashboard. Prevents the back button from showing login
 * after the user is already logged in.
 */
export function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuthStore();

  useEffect(() => {
    if (status !== 'authenticated') return;

    // Pages that authenticated users should NOT see
    const authOnlyPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password'];
    if (authOnlyPaths.some((p) => pathname.startsWith(p))) {
      router.replace('/dashboard');
    }
  }, [status, pathname, router]);

  // Show nothing while redirecting
  if (status === 'authenticated') {
    const authOnlyPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password'];
    if (authOnlyPaths.some((p) => pathname.startsWith(p))) {
      return null;
    }
  }

  return <>{children}</>;
}
