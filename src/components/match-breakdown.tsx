"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

import type { Job } from "@/types/job";
import { useResume } from "@/lib/resume";
import { useProfile } from "@/lib/profile";
import { resumeTerms, scoreJob, BAND_LABEL } from "@/lib/ats";
import { trackEvent } from "@/lib/analytics";
import { ResumePrompt } from "@/components/resume-prompt";
import { cn } from "@/lib/utils";

export function MatchBreakdown({ job }: { job: Job }) {
  const { resume, hydrated } = useResume();
  const { profile } = useProfile();

  const result = React.useMemo(() => {
    if (!resume) return null;
    return scoreJob(resumeTerms(resume.text), job, profile?.experienceYears);
  }, [resume, job, profile?.experienceYears]);

  React.useEffect(() => {
    if (result) {
      trackEvent({
        name: "ats_scored",
        props: { band: result.band, score: result.score },
      });
    }
  }, [result]);

  if (!hydrated) return null;

  if (!resume || !result) {
    return (
      <section className="mt-10">
        <h2 className="font-display text-xl text-text">Your match</h2>
        <div className="mt-3">
          <ResumePrompt
            title="See how you match this role"
            blurb="Add your résumé — parsed in your browser, kept on this device — for an ATS-style keyword and skills match against this job."
          />
        </div>
      </section>
    );
  }

  const ring =
    result.band === "high"
      ? "text-emerald-400"
      : result.band === "medium"
        ? "text-amber-400"
        : "text-text-faint";

  return (
    <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex items-center gap-4">
        <Dial score={result.score} className={ring} />
        <div>
          <h2 className="font-display text-lg text-text">
            {BAND_LABEL[result.band]}
          </h2>
          <p className="mt-0.5 text-[13px] text-text-muted">
            ATS match — an on-device keyword &amp; skills overlap between your
            résumé and this job. Not a recruiter decision.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <KeywordList
          heading="In your résumé"
          items={result.matched}
          icon={<Check className="h-3.5 w-3.5 text-emerald-400" />}
          tone="text-text-muted"
          empty="No strong overlap yet."
        />
        <KeywordList
          heading="Missing — worth adding"
          items={result.missing}
          icon={<X className="h-3.5 w-3.5 text-text-faint" />}
          tone="text-text-muted"
          empty="You cover the key terms. 🎯"
        />
      </div>
    </section>
  );
}

function Dial({ score, className }: { score: number; className?: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0 -rotate-90">
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="5"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * Math.min(100, score)) / 100}
        className={className}
      />
      <text
        x="28"
        y="28"
        transform="rotate(90 28 28)"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-text font-display text-[15px]"
      >
        {score}
      </text>
    </svg>
  );
}

function KeywordList({
  heading,
  items,
  icon,
  tone,
  empty,
}: {
  heading: string;
  items: string[];
  icon: React.ReactNode;
  tone: string;
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
        {heading}
      </h3>
      {items.length === 0 ? (
        <p className={cn("mt-2 text-[13px]", tone)}>{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((k) => (
            <li
              key={k}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[12px] text-text-muted"
            >
              {icon}
              {k}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
