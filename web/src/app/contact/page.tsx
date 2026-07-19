import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { Mail, MessageCircle, Instagram, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the team behind Synkaro.',
};

const channels = [
  {
    icon: Mail,
    label: 'Email',
    value: 'support@bhupeshchauhan.in',
    href: 'mailto:support@bhupeshchauhan.in',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '+91 7500847019',
    href: 'https://wa.me/917500847019',
  },
  {
    icon: Instagram,
    label: 'Instagram',
    value: '@bhupeshchauhanz',
    href: 'https://instagram.com/bhupeshchauhanz',
  },
  {
    icon: Globe,
    label: 'Website',
    value: 'bhupeshchauhan.in',
    href: 'https://bhupeshchauhan.in',
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="section">
        <div className="mx-auto max-w-3xl">
          <div className="badge mb-5">Get in touch</div>
          <h1 className="font-display text-5xl font-bold tracking-tightest md:text-6xl">
            We'd love to <span className="gradient-text">hear from you.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary">
            Bug? Idea? Feedback? Pricing question? Just want to say hi? Pick any channel below —
            replies usually come within a few hours.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-2">
            {channels.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-lg border border-border bg-bg-card p-5 transition-all hover:border-border-strong hover:bg-bg-elevated hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-bg-elevated border border-white/[0.08] text-text-secondary group-hover:text-white transition-colors">
                  <c.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                    {c.label}
                  </p>
                  <p className="truncate text-sm font-semibold text-text-primary">{c.value}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
