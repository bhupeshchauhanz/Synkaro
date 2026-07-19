import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { posts, getRelatedPosts } from '../posts';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { ShareButtons } from '@/components/blog/share-buttons';
import { ArrowLeft, ArrowRight, Clock, Calendar, User } from 'lucide-react';

interface Params {
  params: { slug: string };
}

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt },
  };
}

function renderMarkdown(md: string): string {
  // Lightweight markdown -> HTML for our content shape (h2, h3, bold, links, lists, blockquote)
  let html = md.trim();

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

  // Bold + links
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Lists
  html = html.replace(/(^|\n)((?:- .+\n?)+)/g, (_, p1, block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((line: string) => `<li>${line.replace(/^- /, '')}</li>`)
      .join('');
    return `${p1}<ul>${items}</ul>`;
  });

  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return '';
      if (/^<(h2|h3|ul|ol|blockquote)/.test(t)) return t;
      return `<p>${t.replace(/\n/g, ' ')}</p>`;
    })
    .join('\n');

  return html;
}

export default function BlogPostPage({ params }: Params) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug);
  const html = renderMarkdown(post.content);
  const url = `https://synkaro.bhupeshchauhan.in/blog/${post.slug}`;

  return (
    <main className="min-h-screen">
      <Navbar />
      <article className="mx-auto max-w-3xl px-6 py-32">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All posts
        </Link>

        <p className="mt-10 text-xs uppercase tracking-wider text-white font-medium">
          {post.category}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tightest md:text-5xl">
          {post.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <User className="h-3 w-3" /> {post.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> {post.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> {post.readingTime}
          </span>
        </div>

        <div
          className="prose-synkaro mt-12"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-16 border-t border-border pt-8">
          <p className="mb-3 text-xs uppercase tracking-wider text-text-tertiary">Share this</p>
          <ShareButtons url={url} title={post.title} />
        </div>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-border bg-bg-surface/50 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">Related reads</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col rounded-lg border border-border bg-bg-card p-5 transition-all hover:border-border-strong hover:bg-bg-elevated hover:-translate-y-0.5"
                >
                  <div className="text-[11px] uppercase tracking-wider text-text-tertiary">
                    {p.category}
                  </div>
                  <h3 className="mt-2 font-display text-base font-semibold tracking-tight group-hover:gradient-text transition-all">
                    {p.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-text-secondary line-clamp-2">
                    {p.excerpt}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white">
                    Read <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <Footer />
    </main>
  );
}
