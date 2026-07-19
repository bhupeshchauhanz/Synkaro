import type { Metadata } from 'next';
import Link from 'next/link';
import { posts, getFeaturedPost } from './posts';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { ArrowRight, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Watch-together guides, couple-app tips, and the engineering behind Synkaro.',
};

export default function BlogIndex() {
  const featured = getFeaturedPost();
  const others = posts.filter((p) => p.slug !== featured.slug);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="section pt-32">
        <div className="mx-auto max-w-6xl">
          <div className="badge mb-5">
            <Sparkles className="h-3 w-3 text-white" />
            Stories & Guides
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tightest md:text-6xl">
            From the <span className="gradient-text">Synkaro desk.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-text-secondary">
            Watch-together how-tos, couple-app reviews, and dev notes from building Synkaro.
          </p>

          {/* Featured */}
          <Link
            href={`/blog/${featured.slug}`}
            className="group mt-12 block overflow-hidden rounded-xl border border-border bg-bg-card transition-all hover:border-border-strong hover:bg-bg-elevated"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-white/[0.04]">
                <div className="mesh-bg absolute inset-0 opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <span className="font-display text-6xl md:text-7xl gradient-text font-bold tracking-tightest">
                    Synkaro
                  </span>
                </div>
                <div className="absolute top-4 left-4 badge-pink">Featured</div>
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary">
                  {featured.category}
                </div>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl group-hover:gradient-text transition-all">
                  {featured.title}
                </h2>
                <p className="mt-4 leading-relaxed text-text-secondary">{featured.excerpt}</p>
                <div className="mt-6 flex items-center gap-3 text-xs text-text-tertiary">
                  <span>{featured.author}</span>
                  <span>·</span>
                  <span>{featured.date}</span>
                  <span>·</span>
                  <span>{featured.readingTime}</span>
                </div>
                <div className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-white">
                  Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Link>

          {/* Grid */}
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {others.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-lg border border-border bg-bg-card p-6 transition-all hover:border-border-strong hover:bg-bg-elevated hover:-translate-y-0.5"
              >
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary">
                  {post.category}
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold tracking-tight group-hover:gradient-text transition-all">
                  {post.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="mt-5 flex items-center justify-between text-[11px] text-text-tertiary">
                  <span>{post.date}</span>
                  <span>{post.readingTime}</span>
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
