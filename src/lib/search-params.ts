import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  FILTER_KEYS,
  FILTER_OPTIONS,
  type FilterKey,
} from "@/lib/filters";
import type { JobQuery, JobSort } from "@/types/job";

const VALID_SORTS: JobSort[] = ["recent", "oldest", "company"];

type RawParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : value.split(",");
  return list.map((s) => s.trim()).filter(Boolean);
}

/** Next.js `searchParams` (already-parsed object) -> typed JobQuery. */
export function parseJobQuery(params: RawParams): JobQuery {
  const query: JobQuery = {};

  const q = typeof params.q === "string" ? params.q.trim() : "";
  if (q) query.q = q;

  for (const key of FILTER_KEYS) {
    const allowed = new Set(FILTER_OPTIONS[key]);
    const values = toArray(params[key]).filter((v) => allowed.has(v));
    if (values.length) {
      (query[key] as string[]) = values;
    }
  }

  const sort = typeof params.sort === "string" ? params.sort : "";
  query.sort = (VALID_SORTS as string[]).includes(sort)
    ? (sort as JobSort)
    : DEFAULT_SORT;

  const page = Number(params.page);
  query.page = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  query.pageSize = DEFAULT_PAGE_SIZE;

  return query;
}

/** Typed JobQuery -> URLSearchParams (stable key order, omits defaults). */
export function serializeJobQuery(query: JobQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  for (const key of FILTER_KEYS) {
    for (const v of (query[key] as string[] | undefined) ?? []) sp.append(key, v);
  }
  if (query.sort && query.sort !== DEFAULT_SORT) sp.set("sort", query.sort);
  if (query.page && query.page > 1) sp.set("page", String(query.page));
  return sp;
}

export function jobsHref(query: JobQuery): string {
  const sp = serializeJobQuery(query);
  const s = sp.toString();
  return s ? `/jobs?${s}` : "/jobs";
}

export function countActiveFilters(query: JobQuery): number {
  let n = 0;
  for (const key of FILTER_KEYS) n += ((query[key] as string[]) ?? []).length;
  if (query.q) n += 1;
  return n;
}

export function toggleFilterValue(
  query: JobQuery,
  key: FilterKey,
  value: string,
): JobQuery {
  const current = new Set(((query[key] as string[]) ?? []));
  if (current.has(value)) current.delete(value);
  else current.add(value);
  return {
    ...query,
    [key]: [...current],
    page: 1,
  };
}
