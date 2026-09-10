"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-5xl text-gold-soft">Hmm.</p>
      <h1 className="mt-4 font-display text-2xl text-text">
        Something went wrong loading this page
      </h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        It is not you. Try again, and if it keeps happening head back to the job
        board.
      </p>
      {error?.digest && (
        <p className="mt-3 font-mono text-[11px] text-text-faint">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-[var(--radius)] bg-gold px-4 py-2 text-sm font-medium text-[#1a1406] hover:bg-gold-soft"
        >
          Try again
        </button>
        <Link
          href="/jobs"
          className="rounded-[var(--radius)] border border-[var(--border-strong)] px-4 py-2 text-sm text-text hover:bg-[var(--bg-elevated)]"
        >
          Browse jobs
        </Link>
      </div>
    </div>
  );
}
