"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";

import { useProfile, bandToLevel, firstName } from "@/lib/profile";

const NUDGE_KEY = "pmdj.nudge";

function useNudgeDismissed(): [boolean, () => void] {
  // Start "dismissed" so nothing renders during SSR / hydration, then read the
  // real value from sessionStorage in an effect (see useProfile for why).
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional client hydration */
    try {
      setDismissed(sessionStorage.getItem(NUDGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(NUDGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };
  return [dismissed, dismiss];
}

/**
 * Contextual profile prompt on the jobs page:
 *  - no profile  → invite to set one up
 *  - profile set → offer to filter to the matching PM level
 * Dismissals are per-session so it never nags.
 */
export function ProfileNudge() {
  const { profile, hydrated } = useProfile();
  const router = useRouter();
  const params = useSearchParams();
  const [dismissed, close] = useNudgeDismissed();

  const hasLevelFilter = params.getAll("experienceLevel").length > 0;
  const level = bandToLevel(profile?.experienceYears);

  if (!hydrated || dismissed) return null;

  // Profile set, has a mappable level, not already filtered → offer it.
  if (profile && level && !hasLevelFilter) {
    return (
      <Shell onClose={close}>
        <span className="text-text-muted">
          {firstName(profile)}, based on your profile
          {profile.currentDesignation ? ` (${profile.currentDesignation})` : ""} —
        </span>{" "}
        <button
          onClick={() => {
            const sp = new URLSearchParams(params.toString());
            sp.set("experienceLevel", level);
            sp.delete("page");
            router.replace(`/jobs?${sp.toString()}`, { scroll: false });
          }}
          className="inline-flex items-center gap-1 font-medium text-gold-soft hover:text-gold"
        >
          show {level} roles <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </Shell>
    );
  }

  // No profile → invite.
  if (!profile) {
    return (
      <Shell onClose={close}>
        <span className="text-text-muted">
          Get roles tailored to your experience.
        </span>{" "}
        <Link
          href="/welcome"
          className="inline-flex items-center gap-1 font-medium text-gold-soft hover:text-gold"
        >
          Set up your profile <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <span className="text-text-faint"> · 30 seconds, no account</span>
      </Shell>
    );
  }

  return null;
}

function Shell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[rgba(216,179,106,0.24)] bg-[var(--gold-dim)] px-4 py-2.5 text-[13px]">
      <Sparkles className="h-4 w-4 shrink-0 text-gold" />
      <p className="flex-1 leading-relaxed">{children}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-text-faint hover:text-text"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
