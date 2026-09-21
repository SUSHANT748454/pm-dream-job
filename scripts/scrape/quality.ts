import { resolveLocation, stripHtml } from "../ingest/classify.ts";
import { cleanTitle, isProductManagerRole, type RawJob } from "../ingest/core.ts";

/**
 * Quality rules for web-scraped listings. Pure (no I/O), so the same code the
 * scraper runs can be exercised against saved Actor output.
 */

/** Stop one prolific poster (or reposter) from flooding the board. */
export const MAX_PER_COMPANY = 10;

/** Same bar every other source has to clear, plus two web-board specifics. */
export function isKeeper(job: RawJob): boolean {
  const title = cleanTitle(job.sourceTitle);
  if (!isProductManagerRole(title)) return false;
  if (/\bwalk[\s-]?in\b/i.test(title)) return false; // Naukri walk-in drives, not real reqs
  if (!job.applyUrl) return false;
  return resolveLocation(job.rawLocation, stripHtml(job.descriptionHtmlOrText).slice(0, 400)).isIndia;
}

const normCompany = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|inc|llc|llp|india)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const normTitle = (s: string) =>
  cleanTitle(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * How long a scraped role stays listed after the searches stop returning it.
 * Most boards keep a posting up ~30 days; 21 keeps the board fresh without
 * dropping roles that are almost certainly still open.
 */
export const RETAIN_DAYS = 21;

/**
 * Roles from the previous snapshot that this scrape didn't return but that are
 * still recent enough to keep listing.
 *
 * Missing from a new scrape does NOT mean closed: each search is capped (the
 * top 250–300 from the last 7 days), so a role posted 8+ days ago can never
 * come back in results. Treating absence as closure silently dropped 119
 * still-open roles — Google, JioSaavn, TeamViewer — two days after they
 * appeared. So age out by posting date instead.
 *
 * Only for sources that succeeded this run; a failed source's jobs are
 * carried over wholesale by the caller.
 */
export function retainFromPrevious(
  previous: readonly RawJob[],
  fresh: readonly RawJob[],
  succeededSources: ReadonlySet<string>,
  now = Date.now(),
): RawJob[] {
  const seen = new Set(fresh.map((j) => roleKey(j)));
  return previous.filter((j) => {
    if (!succeededSources.has(j.source) || seen.has(roleKey(j))) return false;
    const posted = j.postedAt ? Date.parse(j.postedAt) : NaN;
    return Number.isFinite(posted) && (now - posted) / 86_400_000 <= RETAIN_DAYS;
  });
}

/** Identity of a role across scrapes and across boards: company + title. */
export const roleKey = (j: RawJob) => `${normCompany(j.companyName)}::${normTitle(j.sourceTitle)}`;

/**
 * Collapse reposts and cap per company. The same role routinely appears on
 * several boards, and some posters list one role once per city — one sample
 * had "Product Manager" at a single company five times in 25 results.
 *
 * `sourcePriority` lists source labels best-first; it decides which copy of a
 * duplicated role survives.
 */
export function dedupeAndCap(jobs: RawJob[], sourcePriority: readonly string[]): RawJob[] {
  const priority = new Map(sourcePriority.map((label, i) => [label, i]));
  const score = (j: RawJob) => {
    const city = resolveLocation(j.rawLocation).city;
    return [
      -(priority.get(j.source) ?? 99), // earlier source wins
      city && city !== "India" ? 1 : 0, // a real city beats a bare "India"
      j.descriptionHtmlOrText.length, // richer listing wins
    ];
  };
  const better = (a: RawJob, b: RawJob) => {
    const [x, y] = [score(a), score(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };

  const byRole = new Map<string, RawJob>();
  for (const j of jobs) {
    const key = roleKey(j);
    const cur = byRole.get(key);
    if (!cur || better(j, cur)) byRole.set(key, j);
  }

  const perCompany = new Map<string, number>();
  const out: RawJob[] = [];
  for (const j of byRole.values()) {
    const c = normCompany(j.companyName);
    const n = perCompany.get(c) ?? 0;
    if (n >= MAX_PER_COMPANY) continue;
    perCompany.set(c, n + 1);
    out.push(j);
  }
  return out;
}
