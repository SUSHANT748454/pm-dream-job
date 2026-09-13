import { decodeEntities } from "./classify.ts";
import { cleanTitle, fetchJson, isProductManagerRole, isoDate, sleep, type RawJob } from "./core.ts";
import type { SeedCompany } from "./companies.ts";

/**
 * Workday adapter — the channel that reaches India GCC roles the other three
 * ATS boards miss entirely (most large enterprises run Workday, and their
 * India offices hire plenty of PMs).
 *
 * Two things make it shaped differently from Greenhouse/Lever/Ashby:
 *
 *  1. It's a POST search API, not a "give me the whole board" GET, so we
 *     paginate `searchText` instead of filtering one big list.
 *  2. The list response has no description and only a relative date
 *     ("Posted 30+ Days Ago"), so each keeper needs a second call to the
 *     detail endpoint for the real body + an ISO `startDate`.
 *
 * Deliberately NOT using Workday's location facets: the facet ids look global
 * but are per-tenant (probing found India's id on one tenant returning
 * Singapore roles on another). Filtering on `locationsText` is boring and
 * correct.
 */

const PAGE = 20;
const MAX_PAGES = 5;

const INDIA_TEXT =
  /\b(india|ind|bengaluru|bangalore|mumbai|pune|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad)\b/i;

/** "2 Locations" / "3 Locations" — can't tell from the list, ask the detail endpoint. */
const MULTI_LOCATION = /^\s*\d+\s+locations?\s*$/i;

interface WorkdayList {
  total?: number;
  jobPostings?: Array<{
    title?: string;
    externalPath?: string;
    locationsText?: string;
    postedOn?: string;
  }>;
}

interface WorkdayDetail {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    startDate?: string;
    externalUrl?: string;
    country?: { descriptor?: string };
  };
}

function baseUrl(c: SeedCompany): string {
  return `https://${c.slug}.wd${c.wd}.myworkdayjobs.com/wday/cxs/${c.slug}/${c.site}`;
}

export async function fromWorkday(c: SeedCompany): Promise<RawJob[]> {
  if (!c.wd || !c.site) return [];
  const base = baseUrl(c);

  // Phase 1 — page the search for candidate titles.
  const candidates: { title: string; path: string; loc: string }[] = [];
  for (let offset = 0; offset < MAX_PAGES * PAGE; offset += PAGE) {
    let data: WorkdayList;
    try {
      data = await fetchJson<WorkdayList>(
        `${base}/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appliedFacets: {},
            limit: PAGE,
            offset,
            searchText: "product manager",
          }),
        },
        30000,
      );
    } catch (err) {
      // A wrong site path 404s/422s on the very first page — report once, move on.
      if (offset === 0) throw err;
      break;
    }
    const postings = data.jobPostings ?? [];
    for (const p of postings) {
      const title = cleanTitle(p.title || "");
      if (!title || !isProductManagerRole(title) || !p.externalPath) continue;
      const loc = p.locationsText || "";
      if (!INDIA_TEXT.test(loc) && !MULTI_LOCATION.test(loc)) continue;
      candidates.push({ title, path: p.externalPath, loc });
    }
    if (postings.length < PAGE) break;
    await sleep(250);
  }

  // Phase 2 — fetch each keeper's detail for the body, the real date, and a
  // trustworthy country (which also settles the "N Locations" cases).
  const out: RawJob[] = [];
  for (const cand of candidates) {
    let detail: WorkdayDetail;
    try {
      detail = await fetchJson<WorkdayDetail>(`${base}${cand.path}`, undefined, 30000);
    } catch {
      continue;
    }
    const info = detail.jobPostingInfo;
    if (!info) continue;

    const country = info.country?.descriptor || "";
    const location = info.location || cand.loc;
    if (!/india/i.test(country) && !INDIA_TEXT.test(location)) continue;

    out.push({
      sourceTitle: cleanTitle(info.title || cand.title),
      companyName: c.name,
      companyDomain: c.domain,
      companyLogo: null,
      rawLocation: location,
      descriptionHtmlOrText: decodeEntities(info.jobDescription || ""),
      applyUrl:
        info.externalUrl ||
        `https://${c.slug}.wd${c.wd}.myworkdayjobs.com/en-US/${c.site}${cand.path}`,
      postedAt: info.startDate ? isoDate(info.startDate) : null,
      source: `Workday · ${c.name}`,
      domainHints: c.domains,
    });
    await sleep(200);
  }
  return out;
}
