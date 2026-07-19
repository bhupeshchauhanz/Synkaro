'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card text-center">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-text-secondary">Please try again.</p>
        <button onClick={reset} className="btn-primary mt-6">
          Retry
        </button>
      </div>
    </main>
  );
}
