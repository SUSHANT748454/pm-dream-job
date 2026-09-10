import { SEED_COMPANIES, type SeedCompany } from "./companies.ts";
import { decodeEntities } from "./classify.ts";
import { cleanTitle, fetchJson, isProductManagerRole, isoDate, sleep, type RawJob } from "./core.ts";

const INDIA_MUSE_LOCATIONS = [
  "Bengaluru, India",
  "Bangalore, India",
  "Mumbai, India",
  "Pune, India",
  "Hyderabad, India",
  "Gurgaon, India",
  "Gurugram, India",
  "New Delhi, India",
  "Delhi, India",
  "Chennai, India",
  "Noida, India",
  "Kolkata, India",
  "Ahmedabad, India",
  "India",
];

interface MuseResponse {
  page: number;
  page_count: number;
  results: Array<{
    name: string;
    contents: string;
    locations: Array<{ name: string }>;
    company: { name: string };
    publication_date: string;
    refs: { landing_page: string };
  }>;
}

export async function fromTheMuse(): Promise<RawJob[]> {
  const out: RawJob[] = [];
  const seen = new Set<string>();
  const locParams = INDIA_MUSE_LOCATIONS.map(
    (l) => `location=${encodeURIComponent(l)}`,
  ).join("&");

  for (let page = 1; page <= 8; page++) {
    let data: MuseResponse;
    try {
      data = await fetchJson<MuseResponse>(
        `https://www.themuse.com/api/public/jobs?category=Product%20Management&${locParams}&page=${page}`,
      );
    } catch (err) {
      console.warn(`  themuse page ${page}: ${(err as Error).message}`);
      break;
    }
    for (const r of data.results ?? []) {
      const title = cleanTitle(r.name || "");
      if (!isProductManagerRole(title)) continue;
      const loc = (r.locations ?? []).map((l) => l.name).join(" / ");
      // Muse's "Flexible/Remote" bucket is global (mostly US) — require India.
      if (!/india|bengaluru|bangalore|mumbai|pune|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad/i.test(loc))
        continue;
      const key = `${r.company?.name}::${title}::${loc}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        sourceTitle: title,
        companyName: r.company?.name?.trim() || "Unknown",
        companyDomain: null,
        companyLogo: null,
        rawLocation: loc,
        descriptionHtmlOrText: r.contents || "",
        applyUrl: r.refs?.landing_page || "",
        postedAt: r.publication_date ? isoDate(r.publication_date) : null,
        source: "The Muse",
      });
    }
    if (page >= (data.page_count ?? 1)) break;
    await sleep(400);
  }
  return out;
}

interface RemotiveResponse {
  jobs: Array<{
    title: string;
    company_name: string;
    company_logo: string | null;
    candidate_required_location: string;
    job_type: string;
    publication_date: string;
    url: string;
    description: string;
    salary: string;
  }>;
}

export async function fromRemotive(): Promise<RawJob[]> {
  let data: RemotiveResponse;
  try {
    data = await fetchJson<RemotiveResponse>(
      "https://remotive.com/api/remote-jobs?search=product%20manager&limit=200",
    );
  } catch (err) {
    console.warn(`  remotive: ${(err as Error).message}`);
    return [];
  }
  const out: RawJob[] = [];
  for (const j of data.jobs ?? []) {
    const title = cleanTitle(j.title || "");
    if (!isProductManagerRole(title)) continue;
    const region = (j.candidate_required_location || "").toLowerCase();
    const descMentionsIndia = /\bindia\b/i.test(j.description || "");
    if (!region.includes("india") && !descMentionsIndia) continue;
    out.push({
      sourceTitle: title,
      companyName: j.company_name?.trim() || "Unknown",
      companyDomain: null,
      companyLogo: j.company_logo || null,
      rawLocation: `Remote${j.candidate_required_location ? ` (${j.candidate_required_location})` : ""}`,
      descriptionHtmlOrText: j.description || "",
      applyUrl: j.url || "",
      postedAt: j.publication_date ? isoDate(j.publication_date) : null,
      source: "Remotive",
    });
  }
  return out;
}

interface GreenhouseResponse {
  jobs: Array<{
    title: string;
    location: { name: string };
    absolute_url: string;
    updated_at: string;
    content: string;
  }>;
}

async function fromGreenhouse(c: SeedCompany): Promise<RawJob[]> {
  const data = await fetchJson<GreenhouseResponse>(
    `https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs?content=true`,
  );
  const out: RawJob[] = [];
  for (const j of data.jobs ?? []) {
    const title = cleanTitle(j.title || "");
    if (!isProductManagerRole(title)) continue;
    const loc = j.location?.name || "";
    if (!/india|bengaluru|bangalore|mumbai|pune|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata|remote/i.test(loc))
      continue;
    out.push({
      sourceTitle: title,
      companyName: c.name,
      companyDomain: c.domain,
      companyLogo: null,
      rawLocation: loc,
      descriptionHtmlOrText: decodeEntities(j.content || ""),
      applyUrl: j.absolute_url || "",
      postedAt: j.updated_at ? isoDate(j.updated_at) : null,
      source: `Greenhouse · ${c.name}`,
      domainHints: c.domains,
    });
  }
  return out;
}

interface LeverPosting {
  text: string;
  categories: { location?: string; commitment?: string; team?: string };
  hostedUrl: string;
  applyUrl: string;
  createdAt: number;
  descriptionPlain?: string;
  description?: string;
  lists?: Array<{ text: string; content: string }>;
}

async function fromLever(c: SeedCompany): Promise<RawJob[]> {
  const data = await fetchJson<LeverPosting[]>(
    `https://api.lever.co/v0/postings/${c.slug}?mode=json`,
  );
  const out: RawJob[] = [];
  for (const j of data ?? []) {
    const title = cleanTitle(j.text || "");
    if (!isProductManagerRole(title)) continue;
    const loc = j.categories?.location || "";
    if (!/india|bengaluru|bangalore|mumbai|pune|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata|remote/i.test(loc))
      continue;
    const body = [
      j.descriptionPlain || j.description || "",
      ...(j.lists ?? []).map((l) => `\n${l.text}\n${l.content}`),
    ].join("\n");
    out.push({
      sourceTitle: title,
      companyName: c.name,
      companyDomain: c.domain,
      companyLogo: null,
      rawLocation: loc,
      descriptionHtmlOrText: body,
      applyUrl: j.hostedUrl || j.applyUrl,
      postedAt: j.createdAt ? isoDate(j.createdAt) : null,
      source: `Lever · ${c.name}`,
      domainHints: c.domains,
    });
  }
  return out;
}

interface AshbyResponse {
  jobs: Array<{
    title: string;
    location: string;
    employmentType: string;
    isRemote: boolean;
    publishedAt: string;
    jobUrl: string;
    descriptionPlain?: string;
    descriptionHtml?: string;
    address?: { postalAddress?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } };
  }>;
}

async function fromAshby(c: SeedCompany): Promise<RawJob[]> {
  const data = await fetchJson<AshbyResponse>(
    `https://api.ashbyhq.com/posting-api/job-board/${c.slug}?includeCompensation=true`,
  );
  const out: RawJob[] = [];
  for (const j of data.jobs ?? []) {
    const title = cleanTitle(j.title || "");
    if (!isProductManagerRole(title)) continue;
    const country = j.address?.postalAddress?.addressCountry || "";
    const loc = j.location || "";
    if (
      !/india/i.test(country) &&
      !/india|bengaluru|bangalore|mumbai|pune|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata/i.test(loc) &&
      !j.isRemote
    )
      continue;
    out.push({
      sourceTitle: title,
      companyName: c.name,
      companyDomain: c.domain,
      companyLogo: null,
      rawLocation: j.isRemote && !loc ? "Remote" : loc,
      descriptionHtmlOrText: j.descriptionPlain || j.descriptionHtml || "",
      applyUrl: j.jobUrl,
      postedAt: j.publishedAt ? isoDate(j.publishedAt) : null,
      source: `Ashby · ${c.name}`,
      domainHints: c.domains,
    });
  }
  return out;
}

export async function fromAtsBoards(): Promise<RawJob[]> {
  const out: RawJob[] = [];
  for (const c of SEED_COMPANIES) {
    try {
      const jobs =
        c.ats === "greenhouse"
          ? await fromGreenhouse(c)
          : c.ats === "lever"
            ? await fromLever(c)
            : await fromAshby(c);
      if (jobs.length) console.log(`  ${c.ats} · ${c.name}: ${jobs.length}`);
      out.push(...jobs);
    } catch (err) {
      console.warn(`  ${c.ats} · ${c.name}: ${(err as Error).message}`);
    }
    await sleep(250);
  }
  return out;
}
