"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useProfile, firstName } from "@/lib/profile";
import { Button } from "@/components/ui/button";

/**
 * Landing hero actions. Browsing is free for everyone — the primary action is
 * always "Browse jobs" — a profile only changes the secondary action and the
 * subtext underneath (an upsell, not a gate).
 */
export function HeroCtas() {
  const { profile, hydrated } = useProfile();
  const name = firstName(profile);
  const known = hydrated && Boolean(profile);

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/jobs">
            Browse jobs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={known ? "/app" : "/companies"}>
            {known ? "Open your dashboard" : "Explore companies"}
          </Link>
        </Button>
      </div>
      <div className="mt-6 flex justify-center">
        <span className="text-sm text-text-muted">
          {known ? (
            `Welcome back${name ? `, ${name}` : ""}.`
          ) : (
            <>
              Set up a free profile for match scores, tracking and job alerts
              — <Link href="/welcome?next=/jobs" className="text-gold-soft hover:text-gold">30 seconds, optional</Link>.
            </>
          )}
        </span>
      </div>
    </>
  );
}
