'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const submit = async (otp: string) => {
    setSubmitting(true);
    try {
      await api.post('/auth/verify-email', { email, otp });
      toast.success('Email verified');
      router.push('/auth/login?verified=1');
    } catch (err) {
      toast.error(getApiError(err).error);
      setDigits(Array(6).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((c) => c) && next.join('').length === 6) {
      void submit(next.join(''));
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = Array(6)
      .fill('')
      .map((_, i) => text[i] ?? '');
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) void submit(text);
  };

  const onResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New code sent');
      setResendIn(60);
    } catch (err) {
      toast.error(getApiError(err).error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <h1 className="font-display text-3xl font-bold tracking-tight">Verify your email</h1>
      <p className="mt-2 text-sm text-text-secondary">
        We sent a 6-digit code to{' '}
        <span className="text-text-primary font-medium">{email || 'your email'}</span>
      </p>

      <div className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2.5" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
            }}
            inputMode="numeric"
            maxLength={1}
            className="h-12 w-9 sm:h-14 sm:w-12 rounded-md border border-white/[0.08] bg-bg-input text-center font-mono text-lg sm:text-2xl
              focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10
              transition-all"
          />
        ))}
      </div>

      {submitting ? (
        <div className="mt-6 flex justify-center text-text-tertiary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}

      <div className="mt-7 text-center text-sm text-text-secondary">
        Didn't receive it?{' '}
        {resendIn > 0 ? (
          <span className="text-text-tertiary">Resend in {resendIn}s</span>
        ) : (
          <button
            onClick={onResend}
            className="text-text-primary font-medium hover:underline"
          >
            Resend code
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
