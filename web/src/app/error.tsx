'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card max-w-md text-center">
        <h2 className="text-2xl font-semibold">Something broke on our side</h2>
        <p className="mt-2 text-sm text-text-secondary">We've logged it. Try again?</p>
        <button onClick={reset} className="btn-primary mt-6">
          Retry
        </button>
      </div>
    </main>
  );
}
