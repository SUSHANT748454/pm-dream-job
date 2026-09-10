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
const PM_INCLUDE =
  /\b(product manager|product management|product owner|product lead|head of product|vp,? product|director,? product|group product manager|principal product manager|associate product manager|\bapm\b|\bgpm\b|chief product officer|\bcpo\b|product strategy)\b/i;

const PM_EXCLUDE =
  /\b(product marketing|program manager|programme manager|project manager|technical program|delivery manager|engineering manager|design manager|product designer|product design|marketing manager|account manager|product specialist|product support|sales|product analyst intern|data scientist|software engineer|product engineer|product operations|product ops)\b/i;

export function isProductManagerRole(title: string): boolean {
  if (!title) return false;
  if (PM_EXCLUDE.test(title)) return false;
  return PM_INCLUDE.test(title);
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

export function isoDate(d: Date | string | number | null | undefined): string {
  const date = d ? new Date(d) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}
