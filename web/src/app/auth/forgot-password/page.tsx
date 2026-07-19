'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('If an account exists, a reset link is on its way');
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <h1 className="font-display text-3xl font-bold">Reset password</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Enter your email. We'll send you a link to choose a new password.
      </p>

      {sent ? (
        <div className="mt-8 rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success">
          Check your inbox. The link expires in 30 minutes.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-secondary">
        Remembered it?{' '}
        <Link href="/auth/login" className="text-text-primary underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </motion.div>
  );
}
