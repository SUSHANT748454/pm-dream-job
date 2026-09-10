import type { Metadata } from "next";

import { queryJobs, getFacetCounts, getGeneratedAt } from "@/services/jobService";
import { parseJobQuery } from "@/lib/search-params";
import { DEFAULT_PAGE_SIZE, FILTER_KEYS } from "@/lib/filters";
import { relativeDate } from "@/lib/utils";
import { JobCard } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import { FiltersSidebar, FiltersMobileTrigger, type Facets } from "@/components/filters";
import { SortSelect } from "@/components/sort-select";
import { ActiveFilters } from "@/components/active-filters";
import { EmptyState } from "@/components/empty-state";
import { LoadMore } from "@/components/load-more";
import { TrackView } from "@/components/analytics/track-view";
import { ProfileNudge } from "@/components/profile-nudge";

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

type SP = Record<string, string | string[] | undefined>;

export default async function JobsPage(props: { searchParams: Promise<SP> }) {
  const sp = await props.searchParams;
  const query = parseJobQuery(sp);
  const page = query.page ?? 1;

  const result = queryJobs({
    ...query,
    page: 1,
    pageSize: page * DEFAULT_PAGE_SIZE,
  });
  const facets = buildFacets();
  const remaining = result.total - result.jobs.length;
  const generatedAt = getGeneratedAt();

  return (
    <div className="container-page py-10">
      <TrackView
        event={{
          name: "jobs_page_viewed",
          props: { results: result.total, hasQuery: Boolean(query.q) },
        }}
      />

      <header className="max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight text-text">
          Product Manager jobs in India
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {new Date(generatedAt).getFullYear() > 1971
            ? `Updated ${relativeDate(generatedAt.slice(0, 10))} · refreshed every few hours`
            : "Refreshed every few hours"}
        </p>
      </header>

      <div className="mt-6">
        <SearchBar resultCountHint={result.total} />
      </div>

      <div className="mt-4">
        <ProfileNudge />
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <FiltersSidebar facets={facets} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FiltersMobileTrigger facets={facets} />
              <p className="text-sm text-text-muted">
                <span className="font-medium text-text">{result.total}</span>{" "}
                {result.total === 1 ? "role" : "roles"}
              </p>
            </div>
            <SortSelect />
          </div>

          <div className="mt-4">
            <ActiveFilters />
          </div>

          {result.jobs.length === 0 ? (
            <div className="mt-6">
              <EmptyState />
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4">
                {result.jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {remaining > 0 && (
                <LoadMore nextPage={page + 1} remaining={remaining} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
