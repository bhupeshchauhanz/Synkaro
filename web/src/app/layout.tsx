import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { ToastProvider } from '@/components/toast-provider';
import { SplashLoader } from '@/components/splash-loader';
import { NavProgress } from '@/components/nav-progress';
import { AuthProvider } from '@/components/auth-provider';
import { ActiveCallIndicator } from '@/components/call/active-call-indicator';
import { GlobalNotifications } from '@/components/global-notifications';

export const metadata: Metadata = {
  title: {
    default: 'Synkaro — Watch Together. Feel Together.',
    template: '%s | Synkaro',
  },
  description:
    'Watch-together platform for couples and friends. Sync movies, YouTube, and chat in real time across web and mobile.',
  keywords: [
    'watch together',
    'watch party',
    'couple app',
    'sync movie online',
    'long distance relationship app',
  ],
  metadataBase: new URL('https://synkaro.bhupeshchauhan.in'),
  applicationName: 'Synkaro',
  authors: [{ name: 'Bhupesh Chauhan', url: 'https://bhupeshchauhan.in' }],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    url: 'https://synkaro.bhupeshchauhan.in',
    title: 'Synkaro — Watch Together. Feel Together.',
    description: 'Watch-together platform for couples and friends.',
    siteName: 'Synkaro',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Synkaro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synkaro',
    description: 'Watch Together. Feel Together.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://synkaro.bhupeshchauhan.in' },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#08080a',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Synkaro',
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: 'Web, Android, iOS',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  description: 'Watch-together platform for couples and friends',
  url: 'https://synkaro.bhupeshchauhan.in',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-base text-text-primary antialiased">
        <Script
          id="ld-json"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
        <SplashLoader />
        <NavProgress />
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
          <ActiveCallIndicator />
          <GlobalNotifications />
        </AuthProvider>
      </body>
    </html>
  );
}
