"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useProfile, firstName } from "@/lib/profile";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/**
 * Profile-aware hero actions on the landing page.
 *  - no profile → the primary action is to create one (that's the gate)
 *  - profile set → straight into the board / dashboard
 * Server + hydration render show the no-profile variant, so the static HTML is
 * stable and crawlers get a sensible default.
 */
export function HeroCtas() {
  const { profile, hydrated } = useProfile();
  const name = firstName(profile);

  if (hydrated && profile) {
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
            <Link href="/app">Open your dashboard</Link>
          </Button>
        </div>
        <div className="mt-6 flex justify-center">
          <span className="text-sm text-text-muted">
            Welcome back{name ? `, ${name}` : ""}.
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link
            href="/welcome?next=/jobs"
            onClick={() =>
              trackEvent({
                name: "profile_wall_cta_clicked",
                props: { placement: "hero" },
              })
            }
          >
            Create your free profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/companies">Explore companies</Link>
        </Button>
      </div>
      <div className="mt-6 flex justify-center">
        <span className="text-sm text-text-muted">
          30 seconds, no account — it stays on your device.
        </span>
      </div>
    </>
  );
}
