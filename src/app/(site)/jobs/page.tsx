import type { Metadata } from "next";

import {
  getActiveJobList,
  getFacetCounts,
  getGeneratedAt,
} from "@/services/jobService";
import { FILTER_KEYS } from "@/lib/filters";
import { relativeDate } from "@/lib/utils";
import { JobsBrowser } from "@/components/jobs-browser";
import type { Facets } from "@/components/filters";
import { TrackView } from "@/components/analytics/track-view";
import { ProfileGate } from "@/components/profile-gate";

export const metadata: Metadata = {
  title: "Product Manager jobs in India",
  description:
    "Browse and filter Product Management roles across India — APM to Director, by city, work mode and domain.",
  alternates: { canonical: "/jobs" },
};

function buildFacets(): Facets {
  const facets = {} as Facets;
  for (const key of FILTER_KEYS) {
    facets[key] = Object.fromEntries(getFacetCounts(key));
  }
  return facets;
}

export default function JobsPage() {
  const jobs = getActiveJobList();
  const facets = buildFacets();
  const generatedAt = getGeneratedAt();
  const updatedLabel =
    new Date(generatedAt).getFullYear() > 1971
      ? relativeDate(generatedAt.slice(0, 10))
      : null;

  return (
    <>
      <TrackView
        event={{
          name: "jobs_page_viewed",
          props: { results: jobs.length, hasQuery: false },
        }}
      />
      <ProfileGate returnTo="/jobs">
        <JobsBrowser jobs={jobs} facets={facets} updatedLabel={updatedLabel} />
      </ProfileGate>
    </>
  );
}
