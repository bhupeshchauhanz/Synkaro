import type { Metadata } from 'next';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The rules of using Synkaro.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <article className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-xs uppercase tracking-wider text-text-tertiary">
          Last updated: 21 May 2026
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tightest md:text-5xl">
          Terms & Conditions
        </h1>
        <p className="mt-4 text-text-secondary leading-relaxed">
          By using Synkaro, you agree to these terms. They're written to be readable, not
          intimidating.
        </p>

        <div className="prose-synkaro mt-10">
          <h2>1. Your account</h2>
          <p>
            You're responsible for keeping your password safe. One person, one account. Don't
            share credentials. If you sign in with Google, the same Google account stays linked
            to your Synkaro identity.
          </p>

          <h2>2. Acceptable use</h2>
          <p>
            Don't use Synkaro to harass others, share illegal content, distribute pirated media
            you don't own the rights to, run automated abuse, or attempt to break the system.
            We reserve the right to suspend accounts that violate these rules.
          </p>

          <h2>3. Content you upload</h2>
          <p>
            You retain ownership of everything you upload. By uploading, you grant Synkaro a
            limited license to store, transmit, and display that content within rooms you have
            created or joined. You confirm you have the legal right to share whatever you
            upload.
          </p>

          <h2>4. Service is free</h2>
          <p>
            Synkaro is completely free to use. All features including watch together, video calls,
            chat, and room creation are available at no cost. There are no hidden charges or
            premium tiers.
          </p>

          <h2>5. Service availability</h2>
          <p>
            We aim for 99.5% uptime but we don't guarantee uninterrupted service. Maintenance,
            outages, and the occasional bug are part of running a real product. We'll always be
            transparent when something is wrong.
          </p>

          <h2>6. Termination</h2>
          <p>
            You can delete your account any time from your profile settings. We may terminate
            accounts that violate these terms, with notice unless the violation is severe enough
            to warrant immediate action.
          </p>

          <h2>7. Liability</h2>
          <p>
            Synkaro is provided "as is". We're not liable for indirect, incidental, or
            consequential damages. Our total liability is capped at the amount you paid us in
            the previous 12 months.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update these terms occasionally. Material changes will be announced via email
            or in-app banner with at least 14 days notice.
          </p>

          <h2>9. Governing law</h2>
          <p>Indian law applies. Disputes are subject to courts in Delhi, India.</p>

          <h2>10. Contact</h2>
          <p>
            Questions? Email{' '}
            <a href="mailto:support@bhupeshchauhan.in">support@bhupeshchauhan.in</a>.
          </p>
        </div>
      </article>
      <Footer />
    </main>
  );
}
