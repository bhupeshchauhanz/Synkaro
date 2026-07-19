'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { PasswordStrength } from '@/components/auth/password-strength';
import { GoogleButton } from '@/components/auth/google-button';

type Method = 'pick' | 'email';

interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('pick');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>();
  const password = watch('password') ?? '';

  const onSubmit = async (data: SignupForm): Promise<void> => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/signup', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast.success('Check your email for a 6-digit verification code');
      router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      toast.error(getApiError(err).error);
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
      <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-text-secondary">Free for everyone. No card needed.</p>

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
                <p className="text-sm font-semibold text-text-primary">Sign up with Email</p>
                <p className="text-xs text-text-tertiary">Create an account with your email</p>
              </div>
            </button>

            {/* Google option */}
            <div className="rounded-lg border border-border bg-bg-input px-5 py-4">
              <p className="mb-3 text-xs font-medium text-text-tertiary">Or sign up with Google</p>
              <GoogleButton />
            </div>

            <p className="pt-2 text-center text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-text-primary font-medium hover:underline">
                Log in
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
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign-up options
            </button>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Full name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  autoFocus
                  className="input"
                  placeholder="Your name"
                  {...register('name', { required: 'Name is required', minLength: 2 })}
                />
                {errors.name ? (
                  <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="you@example.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email',
                    },
                  })}
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
                    autoComplete="new-password"
                    className="input pr-11"
                    placeholder="••••••••"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'At least 8 characters' },
                      maxLength: { value: 20, message: 'Max 20 characters' },
                    })}
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
                <PasswordStrength value={password} />
                {errors.password ? (
                  <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Confirm password
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input"
                  placeholder="••••••••"
                  {...register('confirmPassword', { required: 'Confirm your password' })}
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-text-primary font-medium hover:underline">
                Log in
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
