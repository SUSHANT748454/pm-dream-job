"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, ArrowRight, Check } from "lucide-react";

import { useProfile } from "@/lib/profile";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

const PERKS = [
  "Roles matched to your PM level and domains",
  "Save and track applications through every stage",
  "An interview question bank to prep with",
];

/**
 * Homepage teaser lock. Visitors without a profile see the real job sections
 * blurred behind a glass card that invites them to set one up. Server +
 * hydration render return `children` untouched, so crawlers and no-JS get the
 * full content and there's no layout shift for returning visitors.
 */
export function ProfileWall({ children }: { children: React.ReactNode }) {
  const { profile, hydrated } = useProfile();

  if (!hydrated || profile) return <>{children}</>;

  return <LockedPreview>{children}</LockedPreview>;
}

function LockedPreview({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    trackEvent({ name: "profile_wall_viewed", props: { placement: "home" } });
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none max-h-[600px] select-none overflow-hidden opacity-55 blur-[7px]"
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-b from-[color-mix(in_oklab,var(--bg)_35%,transparent)] to-[var(--bg)] px-4 pt-14 sm:pt-20">
        <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-card)] p-7 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-xl text-text">
            Set up your profile to see the roles
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            About 30 seconds. It stays on this device — no account, no password.
          </p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left">
            {PERKS.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm text-text-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {p}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link
              href="/welcome?next=/jobs"
              onClick={() =>
                trackEvent({
                  name: "profile_wall_cta_clicked",
                  props: { placement: "home" },
                })
              }
            >
              Create your free profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
