'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Zap, Film, Phone, Shield, Clock, MessageCircle } from 'lucide-react';

const features = [
  { icon: Film, label: 'Unlimited watch time', desc: 'No caps. Binge all night.' },
  { icon: Zap, label: 'Up to 6 members per room', desc: 'Bring your whole squad.' },
  { icon: Phone, label: 'HD video calls', desc: 'Crystal clear, always.' },
  { icon: MessageCircle, label: 'Real-time chat', desc: 'Messages, reactions, typing.' },
  { icon: Shield, label: 'Encrypted', desc: 'Your data stays private.' },
  { icon: Clock, label: 'Smart resume', desc: 'Pick up where you left off.' },
];

const allFeatures = [
  'Unlimited synced watch time',
  'Up to 6 members per room',
  'HD video & audio calls',
  'YouTube sync with real-time controls',
  'Movie uploads (MP4, MKV, WebM)',
  'All room themes & backgrounds',
  'Custom room backgrounds (upload)',
  'Continue watching across sessions',
  'Encrypted chat & reactions',
  'Floating reactions & typing indicators',
  'Watch from inside call',
  'Active call notifications',
  'Room nicknames & personalization',
];

export function Pricing() {
  return (
    <section id="pricing" className="section relative">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-1.5 mb-5">
            <span className="text-xs font-medium text-success">No catch</span>
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Everything is{' '}
            <span className="gradient-text">completely free.</span>
          </h2>
          <p className="mt-5 text-base text-text-secondary md:text-lg max-w-2xl mx-auto">
            No limits, no credit card, no hidden fees. Just sign up and start watching together.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 mx-auto max-w-lg"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-bg-card p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <Zap className="h-6 w-6 text-black" strokeWidth={2.5} />
              </div>
              <h3 className="font-display text-5xl font-bold tracking-tightest">$0</h3>
              <p className="mt-1 text-sm text-text-secondary">
                All features, forever free
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="text-xs font-medium text-success">Free for everyone</span>
              </div>
              <Link href="/auth/signup" className="btn-primary mt-6 w-full">
                Get started free
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="card flex items-start gap-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
                <f.icon className="h-4 w-4 text-text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-tight">{f.label}</h4>
                <p className="mt-0.5 text-xs text-text-tertiary">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-14 card"
        >
          <h3 className="font-display text-xl font-bold tracking-tight mb-1">
            What you get — everything.
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            No tiers. No hidden limits. Every feature is yours.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {allFeatures.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-text-secondary leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
