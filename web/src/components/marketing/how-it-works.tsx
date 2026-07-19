'use client';

import { motion } from 'framer-motion';
import { Plus, Link2, Play } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: Plus,
    title: 'Create your room',
    desc: 'Pick couple or friends. Choose a theme. Done in 10 seconds.',
  },
  {
    num: '02',
    icon: Link2,
    title: 'Invite who matters',
    desc: 'Share a 6-char code or a link. Works on any browser.',
  },
  {
    num: '03',
    icon: Play,
    title: 'Hit play together',
    desc: 'Sync starts the moment they join. Smart resume, no missed frames.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section relative">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="badge mx-auto mb-5">Simple by design</div>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Three steps to your
            <br />
            <span className="gradient-text">first watch night.</span>
          </h2>
        </div>

        <div className="relative mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            className="absolute left-6 right-6 top-12 hidden h-px md:block"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent 100%)',
            }}
          />
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative"
            >
              <div className="card-hover">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-bg-elevated border border-white/[0.08] text-text-primary">
                    <s.icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <span className="font-mono text-xs text-text-tertiary">{s.num}</span>
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
