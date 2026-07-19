'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { GoogleButton } from '@/components/auth/google-button';

type Method = 'pick' | 'email';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [method, setMethod] = useState<Method>('pick');
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm): Promise<void> => {
    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', data);
      setUser(res.data.user);
      toast.success(`Welcome back, ${res.data.user.username}`);
      const next = searchParams.get('next') ?? '/dashboard';
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      // Use replace to prevent back-button returning to login after auth
      router.replace(safeNext);
    } catch (err) {
      const e = getApiError(err);
      if (e.code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email first. Check your inbox.');
      } else {
        toast.error(e.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Sign in to keep watching together.
      </p>

      <AnimatePresence mode="wait">
        {method === 'pick' ? (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-8 space-y-3"
          >
            {/* Email option */}
            <button
              type="button"
              onClick={() => setMethod('email')}
              className="flex w-full items-center gap-4 rounded-lg border border-border bg-bg-input px-5 py-4 text-left transition-all hover:border-border-bright hover:bg-bg-elevated"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-bg-elevated border border-border">
                <Mail className="h-5 w-5 text-text-secondary" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Continue with Email</p>
                <p className="text-xs text-text-tertiary">Use your email and password</p>
              </div>
            </button>

            {/* Google option */}
            <div className="rounded-lg border border-border bg-bg-input px-5 py-4">
              <p className="mb-3 text-xs font-medium text-text-tertiary">Or sign in with Google</p>
              <GoogleButton />
            </div>

            <p className="pt-2 text-center text-sm text-text-secondary">
              New to Synkaro?{' '}
              <Link href="/auth/signup" className="text-text-primary font-medium hover:underline">
                Create account
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={() => setMethod('pick')}
              className="mt-6 flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign-in options
            </button>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  className="input"
                  placeholder="you@example.com"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email ? (
                  <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input pr-11"
                    placeholder="••••••••"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-white/20 bg-bg-input accent-white"
                    {...register('rememberMe')}
                  />
                  Remember me
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              New to Synkaro?{' '}
              <Link href="/auth/signup" className="text-text-primary font-medium hover:underline">
                Create account
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
