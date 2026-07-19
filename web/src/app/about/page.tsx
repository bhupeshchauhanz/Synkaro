import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { Mail, MessageCircle, Instagram, Globe, Heart, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Synkaro is a watch-together platform built for couples and close friends. Learn about our vision, mission, and the team behind it.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="relative section">
        <div className="aurora opacity-40" />
        <div className="mx-auto max-w-3xl">
          <div className="badge mb-5">
            <Heart className="h-3 w-3 text-white" /> Our story
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tightest md:text-6xl">
            Built for the moments that
            <span className="gradient-text"> distance steals.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-text-secondary">
            Synkaro started as a simple idea: long-distance friendships and relationships
            shouldn't feel like waiting. They should feel like being together. We built the
            platform we wished existed when we couldn't be in the same room as the people we
            love.
          </p>
        </div>
      </section>

      <section className="section pt-0">
        <div className="mx-auto max-w-3xl space-y-12">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Our vision</h2>
            <p className="mt-4 leading-relaxed text-text-secondary">
              We're building a world where physical distance never breaks emotional connection.
              Where a movie night with your partner halfway across the world feels exactly like
              sitting on the same couch. Frame-perfect sync, HD calls, and a chat that lives
              right next to your video — that's the baseline. The real magic is in the small
              things: floating reactions, smart resume, couple-only themes, and a UI that
              respects your time and attention.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">What makes us different</h2>
            <p className="mt-4 leading-relaxed text-text-secondary">
              Most "watch party" tools were built for 50-person Zoom calls and corporate
              streaming events. Synkaro is the opposite — it's built for the room with two
              people in it. Couple mode, friend rooms capped at six, and an experience tuned for
              warmth and presence. We measure success by how often you forget you're using an
              app at all.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Where we're going</h2>
            <p className="mt-4 leading-relaxed text-text-secondary">
              Synkaro is in active beta. Native iOS and Android apps, end-to-end encrypted
              chats, smart watch-streak rewards, and shared watchlists are all on the roadmap.
              We ship fast, listen to every piece of feedback, and never compromise on the
              feeling of using the product. Built by one engineer in India, for couples and
              close friends everywhere.
            </p>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="mx-auto max-w-3xl">
          <div className="card relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.04), transparent 70%)',
              }}
            />
            <div className="badge mb-5">
              <Sparkles className="h-3 w-3 text-white" /> Founder
            </div>
            <h3 className="font-display text-3xl font-bold tracking-tight">Bhupesh Chauhan</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Engineer, designer, and the person obsessing over every pixel.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-2 md:grid-cols-2">
              <ContactItem
                icon={Mail}
                label="Email"
                value="support@bhupeshchauhan.in"
                href="mailto:support@bhupeshchauhan.in"
              />
              <ContactItem
                icon={MessageCircle}
                label="WhatsApp"
                value="+91 7500847019"
                href="https://wa.me/917500847019"
              />
              <ContactItem
                icon={Instagram}
                label="Instagram"
                value="@bhupeshchauhanz"
                href="https://instagram.com/bhupeshchauhanz"
              />
              <ContactItem
                icon={Globe}
                label="Website"
                value="bhupeshchauhan.in"
                href="https://bhupeshchauhan.in"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-md border border-border bg-bg-input px-4 py-3 transition-all hover:border-border-strong hover:bg-bg-elevated"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-bg-elevated border border-white/[0.08] text-text-secondary group-hover:text-white transition-colors">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
        <p className="truncate text-sm font-medium text-text-primary">{value}</p>
      </div>
    </Link>
  );
}
