"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";

import { useProfile } from "@/lib/profile";
import { useDismissed } from "@/lib/use-dismissed";
import { trackEvent } from "@/lib/analytics";

/**
 * Slim, dismissible prompt for the pages that stay public (job + company
 * detail). It never blocks the content — it just points visitors without a
 * profile at the 30-second setup. Per-session dismiss so it doesn't nag.
 */
export function ProfileBanner({ returnTo }: { returnTo: string }) {
  const { profile, hydrated } = useProfile();
  const [dismissed, dismiss] = useDismissed("pmdj.profile-banner");

  if (!hydrated || profile || dismissed) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-[var(--radius)] border border-[rgba(216,179,106,0.24)] bg-[var(--gold-dim)] px-4 py-2.5 text-[13px]">
      <Sparkles className="h-4 w-4 shrink-0 text-gold" />
      <p className="flex-1 leading-relaxed text-text-muted">
        Set up your profile to search every role, filter by your level, and track
        your applications.
      </p>
      <Link
        href={`/welcome?next=${encodeURIComponent(returnTo)}`}
        onClick={() =>
          trackEvent({
            name: "profile_wall_cta_clicked",
            props: { placement: "detail-banner" },
          })
        }
        className="inline-flex shrink-0 items-center gap-1 font-medium text-gold-soft hover:text-gold"
      >
        Get started <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-text-faint hover:text-text"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
