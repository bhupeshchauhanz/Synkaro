import Link from 'next/link';

const cols = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },

  {
    title: 'Social',
    links: [
      { href: 'https://instagram.com/bhupeshchauhanz', label: 'Instagram' },
      { href: 'https://bhupeshchauhan.in', label: 'Website' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-black" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight font-display">Synkaro</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-secondary">
              Watch together. Feel together. The watch-together platform for couples and
              friends.
            </p>
            <p className="mt-4 text-xs text-text-tertiary">
              Built by{' '}
              <a
                href="https://bhupeshchauhan.in"
                target="_blank"
                rel="noreferrer"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Bhupesh Chauhan
              </a>
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel={l.href.startsWith('http') ? 'noreferrer' : undefined}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-8 text-xs text-text-tertiary md:flex-row">
          <span>© {new Date().getFullYear()} Synkaro. All rights reserved.</span>
          <span>synkaro.bhupeshchauhan.in</span>
        </div>
      </div>
    </footer>
  );
}
