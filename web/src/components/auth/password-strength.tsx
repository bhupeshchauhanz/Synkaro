'use client';

import { useMemo } from 'react';

const COLORS = ['bg-danger', 'bg-warning', 'bg-white/60', 'bg-success'];
const LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

export function PasswordStrength({ value }: { value: string }) {
  const score = useMemo(() => {
    if (!value) return 0;
    let s = 0;
    if (value.length >= 8) s += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s += 1;
    if (/\d/.test(value)) s += 1;
    if (/[^A-Za-z0-9]/.test(value) && value.length >= 12) s += 1;
    return s;
  }, [value]);

  if (!value) return null;

  return (
    <div className="mt-2.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i < score ? COLORS[score - 1] : 'bg-white/[0.06]'
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-text-tertiary">
        {score > 0 ? LABELS[score - 1] : 'Too short'}
      </p>
    </div>
  );
}
