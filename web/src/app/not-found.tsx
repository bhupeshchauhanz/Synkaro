import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card max-w-md text-center">
        <h1 className="font-display text-5xl font-bold gradient-text">404</h1>
        <p className="mt-3 text-text-secondary">This page wandered off into the multiverse.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Back home
        </Link>
      </div>
    </main>
  );
}
