import "server-only";

import { cache } from "react";

import rawData from "@/data/jobs.json";
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT } from "@/lib/filters";
import { isWithinDays } from "@/lib/utils";
import type {
  BoardStats,
  Company,
  Job,
  JobQuery,
  JobQueryResult,
  JobsDataset,
  JobSort,
} from "@/types/job";

/**
 * Data-access layer. Today it reads a generated JSON file; swapping in a real
 * API later means changing only this module — pages and components call these
 * functions, never the data file directly.
 */

const dataset = rawData as unknown as JobsDataset;

const getActiveJobs = cache((): Job[] =>
  dataset.jobs
    .filter((j) => j.status === "Active")
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
);

const getCompanyList = cache((): Company[] =>
  [...dataset.companies].sort((a, b) => a.name.localeCompare(b.name)),
);

export function getGeneratedAt(): string {
  return dataset.generatedAt;
}

function matchesQuery(job: Job, q: string): boolean {
  const haystack = [
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
  // every whitespace-separated term must appear somewhere
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function inList(value: string, list?: string[]): boolean {
  return !list || list.length === 0 || list.includes(value);
}

function sortJobs(jobs: Job[], sort: JobSort): Job[] {
  const out = [...jobs];
  switch (sort) {
    case "oldest":
      return out.sort((a, b) => a.postedAt.localeCompare(b.postedAt));
    case "company":
      return out.sort(
        (a, b) =>
          a.company.name.localeCompare(b.company.name) ||
          b.postedAt.localeCompare(a.postedAt),
      );
    case "recent":
    default:
      return out.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  }
}

export const queryJobs = cache((query: JobQuery = {}): JobQueryResult => {
  const {
    q = "",
    location,
    experienceLevel,
    workMode,
    employmentType,
    domain,
    sort = DEFAULT_SORT,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = query;

  let jobs = getActiveJobs();

  if (q.trim()) jobs = jobs.filter((j) => matchesQuery(j, q));
  if (location?.length)
    jobs = jobs.filter(
      (j) => inList(j.location.city, location) || (j.workMode === "Remote" && location.includes("Remote")),
    );
  if (experienceLevel?.length)
    jobs = jobs.filter((j) => inList(j.experienceLevel, experienceLevel));
  if (workMode?.length) jobs = jobs.filter((j) => inList(j.workMode, workMode));
  if (employmentType?.length)
    jobs = jobs.filter((j) => inList(j.employmentType, employmentType));
  if (domain?.length)
    jobs = jobs.filter((j) => j.domain.some((d) => domain.includes(d)));

  jobs = sortJobs(jobs, sort);

  const total = jobs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    jobs: jobs.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
});

export const getJobBySlug = cache((slug: string): Job | null => {
  return dataset.jobs.find((j) => j.slug === slug && j.status === "Active") ?? null;
});

export function getAllActiveJobSlugs(): string[] {
  return getActiveJobs().map((j) => j.slug);
}

export const getRelatedJobs = cache((job: Job, limit = 4): Job[] => {
  return getActiveJobs()
    .filter((j) => j.id !== job.id)
    .map((j) => {
      let score = 0;
      if (j.company.id === job.company.id) score += 3;
      if (j.experienceLevel === job.experienceLevel) score += 2;
      if (j.location.city === job.location.city) score += 2;
      score += j.domain.filter((d) => job.domain.includes(d)).length;
      return { j, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.j.postedAt.localeCompare(a.j.postedAt))
    .slice(0, limit)
    .map((x) => x.j);
});

export const getCompanyOpenCounts = cache((): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const j of getActiveJobs())
    counts.set(j.company.id, (counts.get(j.company.id) ?? 0) + 1);
  return counts;
});

export const getCompanies = cache((): Company[] => {
  const counts = getCompanyOpenCounts();
  return getCompanyList().filter((c) => (counts.get(c.id) ?? 0) > 0);
});

export const getCompanyBySlug = cache(
  (slug: string): { company: Company; jobs: Job[] } | null => {
    const company = getCompanyList().find((c) => c.id === slug);
    if (!company) return null;
    const jobs = getActiveJobs().filter((j) => j.company.id === company.id);
    if (jobs.length === 0) return null;
    return { company, jobs };
  },
);

export const getStats = cache((): BoardStats => {
  const jobs = getActiveJobs();
  return {
    activeJobs: jobs.length,
    companies: new Set(jobs.map((j) => j.company.id)).size,
    newThisWeek: jobs.filter((j) => isWithinDays(j.postedAt, 7)).length,
  };
});

export const getFeaturedJobs = cache((limit = 6): Job[] => {
  // Newest jobs from distinct companies, so the landing page looks varied.
  const seen = new Set<string>();
  const featured: Job[] = [];
  for (const j of getActiveJobs()) {
    if (seen.has(j.company.id)) continue;
    seen.add(j.company.id);
    featured.push(j);
    if (featured.length === limit) break;
  }
  return featured;
});

export const getFacetCounts = cache(
  (key: "location" | "experienceLevel" | "workMode" | "employmentType" | "domain") => {
    const counts = new Map<string, number>();
    for (const job of getActiveJobs()) {
      const values =
        key === "location"
          ? [job.location.city]
          : key === "domain"
            ? job.domain
            : [job[key]];
      for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return counts;
  },
);
