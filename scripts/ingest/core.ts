import { createHash } from "node:crypto";

import type { Domain } from "../../src/types/job.ts";

/** What every source adapter returns before normalisation. */
export interface RawJob {
  sourceTitle: string;
  companyName: string;
  companyDomain: string | null;
  companyLogo: string | null;
  rawLocation: string;
  descriptionHtmlOrText: string;
  applyUrl: string;
  postedAt: string | null; // ISO or null
  source: string; // e.g. "The Muse", "Greenhouse · Razorpay"
  domainHints?: Domain[];
  salary?: { min: number | null; max: number | null; currency: string; period: string | null } | null;
}

/**
 * Is this a Product Manager role we want on the board?
 * Include the APM→Director ladder + "Product Owner".
 * Exclude program/project managers, product marketing, and pure design/eng.
 */
// Title shapes that mean "product manager". The second line covers the
// enterprise / Indian-org phrasings the first one misses — "Manager, Product",
// "Senior Manager - Product", "AVP Product", "Director of Product",
// "Product Head" — which are common on Workday boards and at Indian companies.
// PM_EXCLUDE still runs first, so "Manager, Product Marketing" stays out.
const PM_INCLUDE =
  /\b(product manager|product management|product owner|product lead|head of product|vp,? product|director,? product|group product manager|principal product manager|associate product manager|\bapm\b|\bgpm\b|chief product officer|\bcpo\b|product strategy)\b/i;

// "Manager, Product …" only counts when Manager *starts* the title (optionally
// after a seniority word). Without the anchor this swallows titles like
// "Supply Chain Manager, Product Distribution Operations", which is not a PM
// role — the noun before "Manager" is what decides.
const PM_MANAGER_PRODUCT =
  /^\s*(senior|sr\.?|lead|principal|group|associate|assistant|deputy|general)?\s*manager[\s,–—-]+product\b/i;

const PM_INCLUDE_ALT =
  /\b(director of product|vp of product|avp[\s,–—-]*product|product head|head,? product|chief product)\b/i;

// Note the plural/gerund allowances: real listings say "Product Operation"
// (singular) and "Product Engineering", which `product operations` and
// `product engineer` alone both miss. "Product Analytics" / "Product
// Distribution" are analytics and supply-chain roles that read as PM titles
// because of the word order — the noun *after* "Product" is what decides.
const PM_EXCLUDE =
  /\b(product marketing|program manager|programme manager|project manager|technical program|delivery manager|engineering manager|design manager|product designer|product design|marketing manager|account manager|product specialist|product support|sales|product analyst intern|data scientist|software engineer|product engineer(ing)?|product operations?|product ops|product analytics|product distribution)\b/i;

export function isProductManagerRole(title: string): boolean {
  if (!title) return false;
  if (PM_EXCLUDE.test(title)) return false;
  return PM_INCLUDE.test(title) || PM_INCLUDE_ALT.test(title) || PM_MANAGER_PRODUCT.test(title);
}

export function shortHash(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 6);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/** Normalised key for de-duplication across sources. */
export function dedupeKey(companyName: string, title: string, city: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(senior|sr|lead|principal|staff|ii|iii|i|1|2|3)\b/g, "")
      .trim();
  return `${norm(companyName)}::${norm(title)}::${city.toLowerCase()}`;
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—|]\s*(remote|hybrid|onsite|full[- ]time|contract).*$/i, "")
    .replace(/\s*\(.*?(remote|hybrid|onsite|india|bengaluru|bangalore|mumbai).*?\)\s*/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 20000,
): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctl.signal,
      headers: {
        "User-Agent": "PMDreamJob-Ingester/1.0 (+https://github.com/SUSHANT748454/pm-dream-job)",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run `fn` over `items` with at most `limit` in flight.
 *
 * Board fetches are the slow part of a refresh and each company is a different
 * host, so there's nothing to be gained by doing them strictly one at a time —
 * and plenty to lose, since the Workday adapter spends a request per job on top
 * of its paging. Parallelism here is across hosts; the polite per-request
 * sleeps inside each adapter still apply to that adapter's own host.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function isoDate(d: Date | string | number | null | undefined): string {
  const date = d ? new Date(d) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}
