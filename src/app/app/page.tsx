import type { Metadata } from "next";

import { getActiveJobList, getDashboardStats } from "@/services/jobService";
import { JobSearchDashboard } from "@/components/app/job-search-dashboard";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "Job Search" };

export default function AppHomePage() {
  // Trim long-form text from the dashboard payload; "Open full page" links to
  // /jobs/[slug] for the complete listing.
  const jobs = getActiveJobList().map((j) => ({
    ...j,
    description: j.description.slice(0, 600),
    responsibilities: j.responsibilities.slice(0, 6),
    requirements: j.requirements.slice(0, 6),
    preferred: j.preferred.slice(0, 4),
  }));
  const stats = getDashboardStats();

  return (
    <>
      <TrackView event={{ name: "page_viewed", props: { path: "/app" } }} />
      <JobSearchDashboard jobs={jobs} stats={stats} />
    </>
  );
}
