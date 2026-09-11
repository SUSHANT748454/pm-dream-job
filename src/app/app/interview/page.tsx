import type { Metadata } from "next";

import { PracticeSession } from "@/components/app/practice-session";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "Practice Interview" };

export default function InterviewPage() {
  return (
    <>
      <TrackView event={{ name: "page_viewed", props: { path: "/app/interview" } }} />
      <div className="px-4 py-5 sm:px-8">
        <h1 className="font-display text-2xl tracking-tight text-text">
          Practice Interview
        </h1>
        <p className="mt-1 max-w-lg text-sm text-text-muted">
          Timed, self-scored practice rounds from the question bank — no AI,
          just structure. Answer out loud, then rate yourself against what
          interviewers are actually listening for.
        </p>

        <div className="mt-8">
          <PracticeSession />
        </div>
      </div>
    </>
  );
}
