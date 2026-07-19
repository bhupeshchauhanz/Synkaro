'use client';

import { motion } from 'framer-motion';
import { Film, Youtube, Phone, MessageCircle, Heart, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Film,
    title: 'Sync movies',
    desc: 'Upload MP4, MKV, or WebM. Watch together frame-by-frame in true sync.',
  },
  {
    icon: Youtube,
    title: 'YouTube together',
    desc: 'Paste any link. Both press play. Zero screen-sharing, zero lag.',
  },
  {
    icon: Phone,
    title: 'HD video calls',
    desc: 'Self-hosted LiveKit SFU. Crystal-clear calls right beside your movie.',
  },
  {
    icon: MessageCircle,
    title: 'Live chat',
    desc: 'Real-time messaging with typing indicators and floating reactions.',
  },
  {
    icon: Heart,
    title: 'Couple mode',
    desc: 'Private 2-user rooms with custom themes that feel just for you two.',
  },
  {
    icon: Sparkles,
    title: 'Floating reactions',
    desc: 'Tap a heart, watch it float across both screens in real time.',
  },
];

export function Features() {
  return (
    <section id="features" className="section relative">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="badge mx-auto mb-5">Built for the moments that matter</div>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Everything you need for the
            <br />
            <span className="gradient-text">perfect movie night.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-text-secondary md:text-lg">
            Engineered for couples and small friend groups. No bloat. No 50-person calls.
            Just you and the people you love.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card-hover group cursor-default"
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08] text-text-primary transition-all duration-300 group-hover:bg-white/[0.1]">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
