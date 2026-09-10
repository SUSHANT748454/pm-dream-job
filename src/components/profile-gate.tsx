"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useProfile } from "@/lib/profile";

/**
 * Client-side gate for the app's working surfaces — the /jobs search and the
 * /app dashboard. Both are useless without an on-device profile, so visitors
 * who don't have one are sent to the onboarding wizard and returned here once
 * it's done (`?next=<returnTo>`).
 *
 * SEO-safe by construction: the server render and the first client (hydration)
 * render both return `children`, so the static HTML — and any crawler — still
 * gets the full page. The redirect only fires on the client, after mount, for
 * real humans without a profile.
 */
export function ProfileGate({
  children,
  returnTo,
}: {
  children: React.ReactNode;
  returnTo: string;
}) {
  const router = useRouter();
  const { profile, hydrated } = useProfile();
  const gated = hydrated && !profile;

  React.useEffect(() => {
    if (gated) {
      router.replace(`/welcome?next=${encodeURIComponent(returnTo)}`);
    }
  }, [gated, returnTo, router]);

  if (gated) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-gold" />
        <p className="text-sm text-text-muted">Taking you to a 30-second setup…</p>
      </div>
    );
  }

  return <>{children}</>;
}
