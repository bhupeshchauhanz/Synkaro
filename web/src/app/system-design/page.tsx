import type { Metadata } from 'next';
import { TechLogo } from '@/components/tech-logo';

export const metadata: Metadata = {
  title: 'System Design — Synkaro',
  description:
    'How Synkaro is built: the tech stack, why each piece was chosen, the feature set, and the end-to-end system architecture — explained with diagrams.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://synkaro.bhupeshchauhan.in/system-design' },
};

interface Tech {
  slug: string;
  name: string;
  why: string;
  color?: string;
}

const FRONTEND: Tech[] = [
  { slug: 'nextdotjs', name: 'Next.js 14', color: 'ffffff', why: 'App Router + RSC for fast, SEO-friendly pages and a single deploy for UI + routing.' },
  { slug: 'react', name: 'React 18', color: '61DAFB', why: 'Component model for the real-time, highly interactive room / call / watch UIs.' },
  { slug: 'typescript', name: 'TypeScript', color: '3178C6', why: 'End-to-end type safety across web + API prevents whole classes of runtime bugs.' },
  { slug: 'tailwindcss', name: 'Tailwind CSS', color: '06B6D4', why: 'Consistent, fast styling for a premium dark UI without CSS sprawl.' },
  { slug: 'zustand', name: 'Zustand', color: 'ffffff', why: 'Tiny, boilerplate-free global state for auth/session.' },
  { slug: 'socketdotio', name: 'Socket.IO client', color: 'ffffff', why: 'Reliable, reconnecting WebSocket transport for chat, presence, watch-sync and calls signalling.' },
];

const BACKEND: Tech[] = [
  { slug: 'nestjs', name: 'NestJS 10', color: 'E0234E', why: 'Modular, testable server structure with first-class WebSocket gateways and guards.' },
  { slug: 'prisma', name: 'Prisma ORM', color: '2D3748', why: 'Type-safe DB access and schema-as-code; `db push` keeps prod schema in sync on deploy.' },
  { slug: 'postgresql', name: 'PostgreSQL 15', color: '4169E1', why: 'Durable relational store for users, rooms, messages, files and watch history.' },
  { slug: 'redis', name: 'Redis 7', color: 'FF4438', why: 'Ephemeral state: watch-sync, active-call presence, upload locks — fast and TTL-based.' },
  { slug: 'socketdotio', name: 'Socket.IO', color: 'ffffff', why: 'Room-scoped real-time events with server-side membership authorization.' },
];

const INFRA: Tech[] = [
  { slug: 'docker', name: 'Docker Compose', color: '2496ED', why: 'One-command, reproducible multi-service deploys (web, api, db, cache, media, proxy).' },
  { slug: 'nginx', name: 'Nginx', color: '009639', why: 'TLS termination + reverse proxy routing /, /api, WebSockets and /livekit.' },
];

function TechCard({ t }: { t: Tech }) {
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
          <TechLogo slug={t.slug} color={t.color} name={t.name} />
        </div>
        <span className="font-display text-sm font-semibold tracking-tight">{t.name}</span>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-text-secondary">{t.why}</p>
    </div>
  );
}

const FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: '🎬', title: 'Synced watch-together', desc: 'Latency-compensated playback with smooth playbackRate drift correction, a buffering "pause & wait" so no one is force-skipped, and resume-where-you-left-off.' },
  { icon: '📹', title: 'HD voice & video calls', desc: 'LiveKit (WebRTC) with adaptive streaming, poor-network auto camera-off, portrait-aware tiles and pin-to-focus.' },
  { icon: '💬', title: 'Real-time chat', desc: 'Encrypted messages, typing, read receipts, WhatsApp-style persisted reactions with a who-reacted sheet, and reliable delivery with server acks.' },
  { icon: '🔔', title: 'App-wide notifications', desc: 'Sound + browser notification + toast for new messages and incoming calls, with a global accept/decline popup.' },
  { icon: '🔒', title: 'Secure by default', desc: 'JWT + refresh cookies, Helmet CSP, room-membership authorization on every socket event, sanitized input.' },
  { icon: '🛠️', title: 'Admin analytics', desc: 'Signup/message/room trends, room-type split, storage usage, user detail and CSV export.' },
  { icon: '👥', title: 'Couple & friend rooms', desc: 'Couple rooms (max 2) center your partner; friend rooms (max 4) use a responsive grid. A completed profile is required to create or join.' },
  { icon: '⬆️', title: 'Resilient uploads', desc: 'Chunked uploads up to 3GB/video and 4GB/room, streamed to disk with a single-uploader lock and network-drop resume.' },
];

export default function SystemDesignPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border px-6 py-20">
        <div className="mesh-bg pointer-events-none absolute inset-0 -z-10 opacity-30" />
        <div className="mx-auto max-w-5xl text-center">
          <span className="badge">System Design</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tightest md:text-6xl">
            How <span className="gradient-text">Synkaro</span> is built
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary md:text-base">
            A watch-together platform for couples and friends — real-time synced video, HD calls and chat.
            Here&apos;s the stack, the reasoning, and the end-to-end architecture.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16 space-y-20">
        {/* Architecture diagram */}
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Architecture at a glance</h2>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Every service runs as a container behind Nginx. The Next.js app serves the UI; NestJS handles the API and
            real-time gateway; PostgreSQL is the source of truth; Redis holds fast ephemeral state; LiveKit powers WebRTC media.
          </p>
          <div className="card mt-6 overflow-x-auto">
            <svg viewBox="0 0 840 320" className="w-full min-w-[720px]" role="img" aria-label="Synkaro architecture diagram">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6 Z" fill="#8b8b8b" />
                </marker>
              </defs>
              {/* edges — each arrow connects two real services */}
              <g stroke="#5b5b6b" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)">
                <path d="M170 170 L221 170" />
                <path d="M377 162 L436 96" />
                <path d="M377 170 L436 170" />
                <path d="M377 178 L436 246" />
                <path d="M592 162 L651 134" />
                <path d="M592 178 L651 208" />
              </g>

              {/* Client */}
              <g>
                <rect x="20" y="141" width="150" height="58" rx="12" fill="#111117" stroke="#2a2a33" />
                <text x="95" y="167" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">Browser / Mobile</text>
                <text x="95" y="185" textAnchor="middle" fill="#8b8b96" fontSize="10">React · Socket.IO · WebRTC</text>
              </g>

              {/* Nginx */}
              <g>
                <rect x="225" y="141" width="150" height="58" rx="12" fill="#0e1a12" stroke="#1f5133" />
                <text x="300" y="167" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="600">Nginx</text>
                <text x="300" y="185" textAnchor="middle" fill="#8b8b96" fontSize="10">TLS · reverse proxy</text>
              </g>

              {/* Web */}
              <g>
                <rect x="440" y="60" width="150" height="58" rx="12" fill="#111117" stroke="#2a2a33" />
                <text x="515" y="86" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Next.js Web</text>
                <text x="515" y="104" textAnchor="middle" fill="#8b8b96" fontSize="10">SSR + static UI</text>
              </g>

              {/* API */}
              <g>
                <rect x="440" y="141" width="150" height="58" rx="12" fill="url(#g1)" opacity="0.92" />
                <text x="515" y="167" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">NestJS API + WS</text>
                <text x="515" y="185" textAnchor="middle" fill="#eee" fontSize="10">REST · Socket.IO · guards</text>
              </g>

              {/* LiveKit */}
              <g>
                <rect x="440" y="222" width="150" height="58" rx="12" fill="#141414" stroke="#333" />
                <text x="515" y="248" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">LiveKit</text>
                <text x="515" y="266" textAnchor="middle" fill="#8b8b96" fontSize="10">WebRTC SFU (calls)</text>
              </g>

              {/* PostgreSQL */}
              <g>
                <rect x="655" y="100" width="150" height="58" rx="12" fill="#0d1526" stroke="#26406b" />
                <text x="730" y="126" textAnchor="middle" fill="#7aa2f7" fontSize="12" fontWeight="600">PostgreSQL</text>
                <text x="730" y="144" textAnchor="middle" fill="#8b8b96" fontSize="10">Prisma · durable data</text>
              </g>

              {/* Redis */}
              <g>
                <rect x="655" y="185" width="150" height="58" rx="12" fill="#1f0f0f" stroke="#5b2323" />
                <text x="730" y="211" textAnchor="middle" fill="#ff6b6b" fontSize="12" fontWeight="600">Redis</text>
                <text x="730" y="229" textAnchor="middle" fill="#8b8b96" fontSize="10">sync · presence · locks</text>
              </g>
            </svg>
          </div>
        </section>

        {/* Real-time flow */}
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Real-time & sync</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card">
              <h3 className="font-display text-sm font-semibold">Watch sync</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                Play/pause/seek broadcast through the WS gateway and are stored in Redis. Clients compensate for network
                latency, and correct small drift by nudging <code className="text-white">playbackRate</code> rather than
                skipping. If a viewer buffers, everyone soft-pauses until they catch up. Watch position is saved as you
                go and flushed exactly on exit, so you resume where you left off.
              </p>
            </div>
            <div className="card">
              <h3 className="font-display text-sm font-semibold">Calls</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                LiveKit handles media (SFU) with adaptive streaming + dynacast. Presence, incoming-call popups, ringing and
                call records are coordinated over Socket.IO. Poor networks auto-disable the camera to protect audio.
              </p>
            </div>
            <div className="card">
              <h3 className="font-display text-sm font-semibold">Chat</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                Messages are encrypted at rest, delivered with server acknowledgements, and re-synced on reconnect.
                Reactions and read receipts live in message metadata and update live.
              </p>
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Tech stack & why</h2>

          <h3 className="mt-6 mb-3 text-xs uppercase tracking-wider text-text-tertiary">Frontend</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRONTEND.map((t) => <TechCard key={t.name} t={t} />)}
          </div>

          <h3 className="mt-8 mb-3 text-xs uppercase tracking-wider text-text-tertiary">Backend</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BACKEND.map((t) => <TechCard key={t.name} t={t} />)}
          </div>

          <h3 className="mt-8 mb-3 text-xs uppercase tracking-wider text-text-tertiary">Infrastructure</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INFRA.map((t) => <TechCard key={t.name} t={t} />)}
          </div>
          <p className="mt-4 text-xs text-text-tertiary">
            Media: <span className="text-text-secondary">LiveKit (self-hosted WebRTC SFU)</span> — no npm brand mark, shown above in the architecture.
          </p>
        </section>

        {/* Features */}
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Features</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-2 font-display text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Security & data</h2>
          <div className="card mt-6">
            <ul className="grid gap-3 text-sm text-text-secondary md:grid-cols-2">
              <li>• JWT access + refresh tokens in httpOnly cookies, with silent refresh.</li>
              <li>• Every WebSocket event verifies room membership server-side.</li>
              <li>• Helmet CSP, HSTS, nosniff and cross-origin policies at the API.</li>
              <li>• Chat content encrypted at rest; input sanitized (DOMPurify).</li>
              <li>• Uploads: chunked, size/type validated, per-room storage caps, single-uploader lock.</li>
              <li>• Rate limiting via Nest throttler on sensitive routes.</li>
            </ul>
          </div>
        </section>

        <footer className="border-t border-border pt-8 text-center">
          <p className="text-xs text-text-tertiary">
            © {new Date().getFullYear()} Synkaro — designed & built by Bhupesh Chauhan. Proprietary software, all rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
