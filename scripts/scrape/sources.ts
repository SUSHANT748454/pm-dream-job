import { isoDate, type RawJob } from "../ingest/core.ts";

/**
 * Web job sources, each an Apify Store Actor. Every one was test-run against
 * "product manager" in India before being added (2026-09-17); the notes on each
 * record what that showed.
 *
 * Budget: the enabled sources cap out around $0.41 a run and typically cost
 * ~$0.34. At one scheduled run every 3 days that's roughly $3.40/month, inside
 * Apify's free $5 monthly credit — which leaves room for a few manual refreshes
 * from the dashboard. `maxChargeUsd` is enforced by Apify itself, so a
 * mispriced or runaway Actor can't overspend.
 */

export interface WebSource<Item> {
  id: string;
  /** Becomes RawJob.source — shown to visitors as "via LinkedIn". */
  label: string;
  actor: string;
  enabled: boolean;
  input: Record<string, unknown>;
  /**
   * The only top-level fields ever downloaded. Projection runs on Apify's
   * side, so personal data some Actors return (LinkedIn's recruiter name and
   * profile URL, for one) never enters this pipeline.
   */
  fields: readonly string[];
  maxItems: number;
  maxChargeUsd: number;
  map: (item: Item) => RawJob | null;
}

/** Descriptions only feed sectioning + keyword extraction; cap what we store. */
const clip = (s: string, n = 8000) => (s.length > n ? s.slice(0, n) : s);

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Drop tracking params (?trk=… on LinkedIn) so apply links stay clean and stable. */
function withoutQuery(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

const round = (n: number | null | undefined) => (typeof n === "number" && n > 0 ? Math.round(n) : null);

// ---------------------------------------------------------------- LinkedIn
// The strongest source: ~40 of 40 sampled were genuine PM roles at companies
// like Google, Amazon, SAP, Wise, Freshworks. Bills a 150-result minimum.

interface LinkedInItem {
  jobTitle?: string;
  companyName?: string;
  companyWebsite?: string;
  location?: string;
  publishedAt?: string;
  applyUrl?: string;
  jobUrl?: string;
  jobDescription?: string;
  dynamicFilterMatch?: boolean;
}

const linkedin: WebSource<LinkedInItem> = {
  id: "linkedin",
  label: "LinkedIn",
  actor: "cheap_scraper/linkedin-job-scraper",
  enabled: true,
  input: {
    keyword: ["Product Manager"],
    locations: ["India"],
    publishedAt: "r604800", // last 7 days — overlaps a 3-day cadence, so nothing slips between runs
    saveOnlyUniqueItems: true,
    // Flags (doesn't skip) agency postings via dynamicFilterMatch. Deliberately
    // NOT using jobFunctionInclude: LinkedIn labels most PM roles "Product
    // Management and Marketing", so that filter rejected 35 of 40 real ones.
    excludeRecruitingAgencies: true,
    maxItems: 300,
  },
  fields: ["jobTitle", "companyName", "companyWebsite", "location", "publishedAt", "applyUrl", "jobUrl", "jobDescription", "dynamicFilterMatch"],
  maxItems: 300,
  maxChargeUsd: 0.25,
  map: (j) => {
    if (j.dynamicFilterMatch === false) return null; // staffing / recruiting agency
    const url = j.applyUrl || j.jobUrl;
    if (!url || !j.jobTitle || !j.companyName) return null;
    return {
      sourceTitle: j.jobTitle,
      companyName: j.companyName,
      companyDomain: hostOf(j.companyWebsite),
      companyLogo: null,
      rawLocation: j.location || "India",
      descriptionHtmlOrText: clip((j.jobDescription || "").replace(/\s*Show more\s+Show less\s*$/i, "")),
      applyUrl: /linkedin\.com/i.test(url) ? withoutQuery(url) : url,
      postedAt: j.publishedAt ? isoDate(j.publishedAt) : null,
      source: "LinkedIn",
    };
  },
};

// ---------------------------------------------------------------- Naukri
// Sort by relevance ("r"), not freshness: freshness returned 6 PM roles in 25;
// relevance returned 25 in 25. Company-posted jobs only — no consultancies.

interface NaukriItem {
  title?: string;
  company?: { name?: string; websiteUrl?: string };
  locations?: { label?: string }[];
  salary?: { currency?: string; minimum?: number; maximum?: number };
  createdDate?: number;
  url?: string;
  description?: { full?: string; short?: string };
  consultant?: boolean;
}

const naukri: WebSource<NaukriItem> = {
  id: "naukri",
  label: "Naukri",
  actor: "valig/naukri-jobs-scraper",
  enabled: true,
  input: {
    keywords: "product manager",
    location: "India",
    sort: "r",
    jobAge: "7",
    jobPostType: ["1"],
    limit: 250,
  },
  fields: ["title", "company", "locations", "salary", "createdDate", "url", "description", "consultant"],
  maxItems: 250,
  maxChargeUsd: 0.12,
  map: (j) => {
    if (j.consultant) return null;
    if (!j.title || !j.company?.name || !j.url) return null;
    const cities = (j.locations ?? []).map((l) => l.label).filter(Boolean);
    const min = round(j.salary?.minimum);
    return {
      sourceTitle: j.title,
      companyName: j.company.name,
      companyDomain: hostOf(j.company.websiteUrl),
      companyLogo: null,
      // Naukri is India-only and labels cities without the country. Appending
      // it keeps cities the ingest's city map doesn't know (Kochi, Nagpur…)
      // from being dropped as "not India".
      rawLocation: cities.length ? `${cities.join(" / ")}, India` : "India",
      descriptionHtmlOrText: clip(j.description?.full || j.description?.short || ""),
      applyUrl: j.url,
      postedAt: j.createdDate && j.createdDate > 0 ? isoDate(j.createdDate) : null,
      source: "Naukri",
      // Naukri reports annual CTC in rupees ("25-27.5 Lacs" → 2500000).
      salary: min ? { min, max: round(j.salary?.maximum), currency: j.salary?.currency || "INR", period: "year" } : null,
    };
  },
};

// ---------------------------------------------------------------- Indeed
// Weak for PM — Indeed's keyword match is loose (1 real PM role in 25, the rest
// sales/brand managers) — but at $0.0001 a result it's still worth sweeping;
// the title filter throws out the noise for free.

interface IndeedItem {
  title?: string;
  employer?: { name?: string; corporateWebsite?: string };
  location?: { city?: string; countryCode?: string };
  datePublished?: string;
  jobUrl?: string;
  url?: string;
  description?: { text?: string; html?: string };
  baseSalary?: { min?: number; max?: number; currencyCode?: string; unitOfWork?: string };
  expired?: boolean;
}

const indeed: WebSource<IndeedItem> = {
  id: "indeed",
  label: "Indeed",
  actor: "valig/indeed-jobs-scraper",
  enabled: true,
  input: { country: "in", title: "product manager", location: "India", limit: 250, datePosted: "7" },
  fields: ["title", "employer", "location", "datePublished", "jobUrl", "url", "description", "baseSalary", "expired"],
  maxItems: 250,
  maxChargeUsd: 0.04,
  map: (j) => {
    if (j.expired) return null;
    if (j.location?.countryCode && j.location.countryCode !== "IN") return null;
    const url = j.jobUrl || j.url;
    if (!url || !j.title || !j.employer?.name) return null;
    // Hourly pay is almost always a mis-tagged contract rate — don't display it.
    const unit = j.baseSalary?.unitOfWork;
    const period = unit === "YEAR" ? "year" : unit === "MONTH" ? "month" : null;
    const min = round(j.baseSalary?.min);
    const max = round(j.baseSalary?.max);
    return {
      sourceTitle: j.title,
      companyName: j.employer.name,
      companyDomain: hostOf(j.employer.corporateWebsite),
      companyLogo: null,
      rawLocation: j.location?.city ? `${j.location.city}, India` : "India",
      descriptionHtmlOrText: clip(j.description?.text || j.description?.html || ""),
      applyUrl: url,
      postedAt: j.datePublished ? isoDate(j.datePublished) : null,
      source: "Indeed",
      salary: period && (min || max) ? { min, max, currency: j.baseSalary?.currencyCode || "INR", period } : null,
    };
  },
};

// ---------------------------------------------------------------- Foundit
// Disabled: quality is high (25 of 25 real PM roles) but it mostly
// re-syndicates LinkedIn — nearly every apply link points back there — and it
// mangles company names ("Amazon Wood"), which defeats de-duplication. Flip
// `enabled` if LinkedIn ever stops working.

interface FounditItem {
  title?: string;
  company?: string;
  location?: string;
  description_text?: string;
  apply_url?: string;
  url?: string;
  date_posted?: string;
}

const foundit: WebSource<FounditItem> = {
  id: "foundit",
  label: "Foundit",
  actor: "shahidirfan/Foundit-Jobs-Scraper",
  enabled: false,
  // No `location`: passing "India" returned zero results.
  input: { keyword: "product manager", results_wanted: 150, max_pages: 10 },
  fields: ["title", "company", "location", "description_text", "apply_url", "url", "date_posted"],
  maxItems: 150,
  maxChargeUsd: 0.16,
  map: (j) => {
    const url = j.apply_url || j.url;
    if (!url || !j.title || !j.company) return null;
    return {
      sourceTitle: j.title,
      companyName: j.company,
      companyDomain: null,
      companyLogo: null,
      rawLocation: j.location || "India",
      descriptionHtmlOrText: clip(j.description_text || ""),
      applyUrl: url,
      postedAt: j.date_posted ? isoDate(j.date_posted) : null,
      source: "Foundit",
    };
  },
};

// Order is priority when the same role turns up on several boards.
export const WEB_SOURCES = [linkedin, naukri, indeed, foundit] as const;
