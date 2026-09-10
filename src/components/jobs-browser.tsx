"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { Job, JobSort } from "@/types/job";
import {
  FILTER_KEYS,
  FILTER_OPTIONS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  type FilterKey,
} from "@/lib/filters";
import { trackEvent } from "@/lib/analytics";
import { JobCard } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import {
  FiltersSidebar,
  FiltersMobileTrigger,
  type Facets,
} from "@/components/filters";
import { SortSelect } from "@/components/sort-select";
import { ActiveFilters } from "@/components/active-filters";
import { EmptyState } from "@/components/empty-state";
import { LoadMore } from "@/components/load-more";
import { ProfileNudge } from "@/components/profile-nudge";

type Selected = Record<FilterKey, string[]>;

interface State {
  q: string;
  selected: Selected;
  sort: JobSort;
  page: number;
}

const VALID_SORTS: JobSort[] = ["recent", "oldest", "company"];

function emptySelected(): Selected {
  const s = {} as Selected;
  for (const k of FILTER_KEYS) s[k] = [];
  return s;
}

const INITIAL: State = {
  q: "",
  selected: emptySelected(),
  sort: DEFAULT_SORT,
  page: 1,
};

function readUrl(): State {
  if (typeof window === "undefined") return INITIAL;
  const sp = new URLSearchParams(window.location.search);
  const selected = emptySelected();
  for (const key of FILTER_KEYS) {
    const allowed = new Set(FILTER_OPTIONS[key]);
    selected[key] = sp.getAll(key).filter((v) => allowed.has(v));
  }
  const sortRaw = sp.get("sort") ?? "";
  const pageRaw = Number(sp.get("page"));
  return {
    q: sp.get("q") ?? "",
    selected,
    sort: (VALID_SORTS as string[]).includes(sortRaw)
      ? (sortRaw as JobSort)
      : DEFAULT_SORT,
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

function toQuery(state: State): string {
  const sp = new URLSearchParams();
  if (state.q.trim()) sp.set("q", state.q.trim());
  for (const key of FILTER_KEYS) for (const v of state.selected[key]) sp.append(key, v);
  if (state.sort !== DEFAULT_SORT) sp.set("sort", state.sort);
  if (state.page > 1) sp.set("page", String(state.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function matches(job: Job, q: string): boolean {
  const hay = [
    job.title,
    job.company.name,
    job.location.city,
    job.experienceLevel,
    ...job.skills,
    ...job.tags,
    ...job.domain,
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export function JobsBrowser({
  jobs,
  facets,
  updatedLabel,
}: {
  jobs: Job[];
  facets: Facets;
  updatedLabel: string | null;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<State>(INITIAL);

  React.useEffect(() => {
    // Hydrate filter state from the URL after mount (SSR renders the unfiltered
    // list, so server and first client render always agree — no boundary, no
    // useSearchParams, no hydration fragility).
    const apply = () => setState(readUrl());
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  const update = React.useCallback(
    (next: State) => {
      setState(next);
      router.replace(`/jobs${toQuery(next)}`, { scroll: false });
    },
    [router],
  );

  const setSearch = (q: string) => update({ ...state, q, page: 1 });
  const setSort = (sort: JobSort) => update({ ...state, sort, page: 1 });
  const loadMore = () => setState((s) => ({ ...s, page: s.page + 1 }));

  const toggleFilter = (key: FilterKey, value: string) => {
    const has = state.selected[key].includes(value);
    const nextValues = has
      ? state.selected[key].filter((v) => v !== value)
      : [...state.selected[key], value];
    update({
      ...state,
      selected: { ...state.selected, [key]: nextValues },
      page: 1,
    });
    trackEvent({
      name: "filter_applied",
      props: { filter: key, value, active: !has },
    });
  };

  const clearAll = () =>
    update({ q: "", selected: emptySelected(), sort: state.sort, page: 1 });

  const applyLevel = (level: string) =>
    update({
      ...state,
      selected: { ...state.selected, experienceLevel: [level] },
      page: 1,
    });

  const selectedSets = React.useMemo(() => {
    const m = {} as Record<FilterKey, Set<string>>;
    for (const k of FILTER_KEYS) m[k] = new Set(state.selected[k]);
    return m;
  }, [state.selected]);

  const activeCount =
    FILTER_KEYS.reduce((n, k) => n + state.selected[k].length, 0) +
    (state.q ? 1 : 0);

  const filtered = React.useMemo(() => {
    let out = jobs;
    if (state.q.trim()) out = out.filter((j) => matches(j, state.q));
    for (const key of FILTER_KEYS) {
      const set = new Set(state.selected[key]);
      if (set.size === 0) continue;
      out = out.filter((j) => {
        if (key === "location")
          return (
            set.has(j.location.city) ||
            (set.has("Remote") && j.workMode === "Remote")
          );
        if (key === "domain") return j.domain.some((d) => set.has(d));
        if (key === "experienceLevel") return set.has(j.experienceLevel);
        if (key === "workMode") return set.has(j.workMode);
        if (key === "employmentType") return set.has(j.employmentType);
        return true;
      });
    }
    const sorted = [...out];
    if (state.sort === "oldest")
      sorted.sort((a, b) => a.postedAt.localeCompare(b.postedAt));
    else if (state.sort === "company")
      sorted.sort(
        (a, b) =>
          a.company.name.localeCompare(b.company.name) ||
          b.postedAt.localeCompare(a.postedAt),
      );
    else sorted.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    return sorted;
  }, [jobs, state.q, state.selected, state.sort]);

  const count = filtered.length;
  const visible = filtered.slice(0, state.page * DEFAULT_PAGE_SIZE);
  const remaining = filtered.length - visible.length;

  const chips: { key: FilterKey | "q"; value: string }[] = [];
  if (state.q) chips.push({ key: "q", value: state.q });
  for (const key of FILTER_KEYS)
    for (const v of state.selected[key]) chips.push({ key, value: v });

  return (
    <div className="container-page py-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight text-text">
          Product Manager jobs in India
        </h1>
        <p className="mt-2 text-sm text-text-muted" suppressHydrationWarning>
          {updatedLabel
            ? `Updated ${updatedLabel} · refreshed every few hours`
            : "Refreshed every few hours"}
        </p>
      </header>

      <div className="mt-6">
        <SearchBar
          value={state.q}
          resultCountHint={filtered.length}
          onChange={setSearch}
        />
      </div>

      <div className="mt-4">
        <ProfileNudge
          levelFilterActive={state.selected.experienceLevel.length > 0}
          onApplyLevel={applyLevel}
        />
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <FiltersSidebar
          facets={facets}
          selected={selectedSets}
          activeCount={activeCount}
          onToggle={toggleFilter}
          onClearAll={clearAll}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FiltersMobileTrigger
                facets={facets}
                selected={selectedSets}
                activeCount={activeCount}
                onToggle={toggleFilter}
                onClearAll={clearAll}
              />
              <p className="text-sm text-text-muted">
                <span className="font-medium text-text">{count}</span>{" "}
                {count === 1 ? "role" : "roles"}
              </p>
            </div>
            <SortSelect value={state.sort} onChange={setSort} />
          </div>

          <div className="mt-4">
            <ActiveFilters
              chips={chips}
              onRemove={(key, value) => {
                if (key === "q") setSearch("");
                else toggleFilter(key as FilterKey, value);
              }}
            />
          </div>

          {visible.length === 0 ? (
            <div className="mt-6">
              <EmptyState />
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4">
                {visible.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {remaining > 0 && (
                <LoadMore remaining={remaining} onClick={loadMore} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
