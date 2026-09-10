import type { Metadata } from "next";
import Link from "next/link";
import { Mic } from "lucide-react";

import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "AI Mock Interview" };

export default function InterviewPage() {
  return (
    <>
      <TrackView event={{ name: "page_viewed", props: { path: "/app/interview" } }} />
      <div className="px-4 py-5 sm:px-8">
        <h1 className="font-display text-2xl tracking-tight text-text">
          AI Mock Interview
        </h1>
        <p className="mt-1 text-sm text-text-muted">Coming soon.</p>

        <div className="mt-8 max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
            <Mic className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-lg text-text">
            Practise a real PM loop, get scored feedback
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            A guided product-sense or analytical round: the interviewer asks
            follow-ups, you talk through your answer, and you get a rubric-based
            breakdown afterwards — structure, prioritisation, metrics, trade-offs.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            This one needs a language-model backend, so it ships after the core
            board is live. For now, the{" "}
            <Link href="/app/questions" className="text-gold-soft hover:text-gold">
              Question Bank
            </Link>{" "}
            has the questions and how to approach them.
          </p>
        </div>
      </div>
    </>
  );
}
