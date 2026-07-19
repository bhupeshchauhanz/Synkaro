import type { Metadata } from 'next';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Synkaro collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <article className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-xs uppercase tracking-wider text-text-tertiary">
          Last updated: 21 May 2026
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tightest md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-text-secondary leading-relaxed">
          Your privacy matters. This policy explains what we collect, how we use it, and the
          choices you have. We keep this document plain so you can actually read it.
        </p>

        <div className="prose-synkaro mt-10">
          <h2>What we collect</h2>
          <p>
            When you sign up, we collect your name, email, and (if you sign in with Google) your
            Google profile picture and a unique Google account identifier. Inside the app, we
            store the rooms you create or join, the messages you send, files you upload, and your
            watch history. Server logs include your IP address and basic device information for
            security and abuse prevention.
          </p>

          <h2>How we use it</h2>
          <ul>
            <li>To run the product — sync your video, deliver chat, generate call tokens.</li>
            <li>To send you transactional emails: OTPs, password resets, room invites.</li>
            <li>To keep the platform safe — rate limit abuse, detect spam, enforce policies.</li>
            <li>To improve the product, in aggregate. We never sell your data.</li>
          </ul>

          <h2>What we don't do</h2>
          <ul>
            <li>We don't sell or rent your personal information to anyone.</li>
            <li>We don't read your private chats. Messages are stored encrypted at rest.</li>
            <li>We don't run third-party advertising trackers across the app.</li>
          </ul>

          <h2>Cookies and storage</h2>
          <p>
            We use httpOnly cookies for authentication (an access token and a refresh token).
            We use localStorage only for non-sensitive UI preferences like theme. No third-party
            advertising cookies.
          </p>

          <h2>Your rights</h2>
          <p>
            You can request a copy of your data, ask us to delete your account, or correct any
            information by emailing{' '}
            <a href="mailto:support@bhupeshchauhan.in">support@bhupeshchauhan.in</a>. We respond
            within seven business days.
          </p>

          <h2>Data retention</h2>
          <p>
            Account data is kept while your account exists. Uploaded files are kept for 24 hours
            on the Free tier and seven days on Premium, then deleted automatically. Messages
            persist until you delete the room or your account.
          </p>

          <h2>Children</h2>
          <p>
            Synkaro is not intended for users under 13. If you believe a child has signed up,
            please email us and we'll delete the account immediately.
          </p>

          <h2>Contact</h2>
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
