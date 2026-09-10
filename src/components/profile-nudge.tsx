"use client";

import Link from "next/link";
import { Sparkles, X, ArrowRight } from "lucide-react";

import { useProfile, bandToLevel, firstName } from "@/lib/profile";
import { useDismissed } from "@/lib/use-dismissed";

/**
 * Contextual profile prompt on the jobs page:
 *  - no profile  → invite to set one up
 *  - profile set → offer to filter to the matching PM level
 * Dismissals are per-session so it never nags.
 */
export function ProfileNudge({
  levelFilterActive,
  onApplyLevel,
}: {
  levelFilterActive: boolean;
  onApplyLevel: (level: string) => void;
}) {
  const { profile, hydrated } = useProfile();
  const [dismissed, dismiss] = useDismissed("pmdj.nudge");

  const level = bandToLevel(profile?.experienceYears);

  if (!hydrated || dismissed) return null;

  if (profile && level && !levelFilterActive) {
    return (
      <Shell onClose={dismiss}>
        <span className="text-text-muted">
          {firstName(profile)}, based on your profile
          {profile.currentDesignation ? ` (${profile.currentDesignation})` : ""} —
        </span>{" "}
        <button
          onClick={() => onApplyLevel(level)}
          className="inline-flex items-center gap-1 font-medium text-gold-soft hover:text-gold"
        >
          show {level} roles <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell onClose={dismiss}>
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
