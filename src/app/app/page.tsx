import type { Metadata } from "next";
import { Suspense } from "react";

import { getActiveJobList, getDashboardStats } from "@/services/jobService";
import { JobSearchDashboard } from "@/components/app/job-search-dashboard";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "Job Search" };
export const dynamic = "force-dynamic";

export default function AppHomePage() {
  // Trim the long-form text for the dashboard payload; "Open full page" links
  // to /jobs/[slug] for the complete listing.
  const jobs = getActiveJobList().map((j) => ({
    ...j,
    description: j.description.slice(0, 600),
    responsibilities: j.responsibilities.slice(0, 6),
    requirements: j.requirements.slice(0, 6),
    preferred: j.preferred.slice(0, 4),
  }));
  const stats = getDashboardStats();
  // Per-request server timestamp so relative dates match on server and client.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <>
      <TrackView event={{ name: "page_viewed", props: { path: "/app" } }} />
      <Suspense
        fallback={
          <div className="grid h-[60vh] place-items-center text-sm text-text-faint">
            Loading your board…
          </div>
        }
      >
        <JobSearchDashboard jobs={jobs} stats={stats} now={now} />
      </Suspense>
    </>
  );
}
