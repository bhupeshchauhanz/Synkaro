'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { PasswordStrength } from '@/components/auth/password-strength';

function ResetInner() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [used, setUsed] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setUsed(true);
      toast.success('Password updated. Please log in.');
      // Replace history so the reset link can't be reused via back button
      router.replace('/auth/login');
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || used) {
    return (
      <div className="card text-center">
        <p className="text-text-secondary">
          {used ? 'Password has been reset successfully.' : 'This reset link is missing a token.'}
        </p>
        <Link href={used ? '/auth/login' : '/auth/forgot-password'} className="btn-primary mt-6 inline-flex">
          {used ? 'Go to login' : 'Request a new one'}
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <h1 className="font-display text-3xl font-bold">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          type="password"
          required
          minLength={8}
          maxLength={20}
          placeholder="New password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength value={password} />
        <input
          type="password"
          required
          placeholder="Confirm password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
        </button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
