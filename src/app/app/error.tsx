"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl text-text">
        The dashboard hit a snag
      </h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        Try again. Your saved jobs and profile stay on this device, so nothing is
        lost.
      </p>
      {error?.digest && (
        <p className="mt-3 font-mono text-[11px] text-text-faint">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-[var(--radius)] bg-gold px-4 py-2 text-sm font-medium text-[#1a1406]"
        >
          Try again
        </button>
        <Link
          href="/jobs"
          className="rounded-[var(--radius)] border border-[var(--border-strong)] px-4 py-2 text-sm text-text"
        >
          Public job board
        </Link>
      </div>
    </div>
  );
}
