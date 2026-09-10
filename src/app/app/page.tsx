import type { Metadata } from "next";
import { Suspense } from "react";

import { getActiveJobList, getDashboardStats } from "@/services/jobService";
import { JobSearchDashboard } from "@/components/app/job-search-dashboard";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "Job Search" };
export const dynamic = "force-dynamic";

export default function AppHomePage() {
  const jobs = getActiveJobList();
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
