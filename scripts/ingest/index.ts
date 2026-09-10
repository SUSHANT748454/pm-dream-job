import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  classifyDomains,
  classifyEmployment,
  classifyLevel,
  decodeEntities,
  extractExperienceYears,
  extractSkills,
  fixMojibake,
  resolveLocation,
  sectionize,
  stripHtml,
} from "./classify.ts";
import {
  cleanTitle,
  dedupeKey,
  isoDate,
  shortHash,
  slugify,
  type RawJob,
} from "./core.ts";
import { SEED_COMPANIES } from "./companies.ts";
import { fromAtsBoards, fromRemotive, fromTheMuse } from "./sources.ts";
import type {
  Company,
  Job,
  JobsDataset,
} from "../../src/types/job.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(HERE, "../../src/data/jobs.json");

const EXPIRE_AFTER_MS = 12 * 60 * 60 * 1000; // unseen for one full 5h cycle + grace
const DROP_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

const SOURCE_RANK: Record<string, number> = { Greenhouse: 3, Lever: 3, Ashby: 3, "The Muse": 2, Remotive: 1 };
function rankOf(source: string): number {
  const head = source.split(" ")[0];
  return SOURCE_RANK[head] ?? 0;
}

function domainFromName(name: string): string | null {
  const seed = SEED_COMPANIES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  return seed?.domain ?? null;
}

function logoFor(_domain: string | null, fallback: string | null): string | null {
  // The component resolves a logo from the company domain (Google's favicon
  // service) with a monogram fallback, so we only keep an explicit logo URL
  // when a source handed us one directly.
  return fallback;
}

function tidy(s: string): string {
  return decodeEntities(fixMojibake(s || "")).replace(/\s+/g, " ").trim();
}

function normalize(raw: RawJob, now: string): Job | null {
  const title = cleanTitle(tidy(raw.sourceTitle));
  if (!title) return null;

  const text = stripHtml(raw.descriptionHtmlOrText || "");
  const loc = resolveLocation(raw.rawLocation, text.slice(0, 400));
  if (!loc.isIndia) return null;

  const years = extractExperienceYears(text);
  const level = classifyLevel(title, years.min);
  const employmentType = classifyEmployment(title, raw.rawLocation);
  const domain = classifyDomains(`${title} ${text}`, raw.domainHints ?? []);
  const sections = sectionize(text);
  const skills = extractSkills(`${title} ${text}`);

  const companyName = tidy(raw.companyName).replace(/,?\s+(Inc|Ltd|LLC|Pvt|Limited|Private Limited)\.?$/i, "");
  const companyId = slugify(companyName) || shortHash(companyName);
  const domainName = raw.companyDomain ?? domainFromName(companyName);
  const city = loc.city || "India";

  const key = dedupeKey(companyName, title, city);
  const id = `job_${shortHash(key)}`;
  const postedAt = raw.postedAt ?? isoDate(now);

  const tags = Array.from(
    new Set([...domain, level, loc.workMode, ...skills.slice(0, 4)]),
  ).slice(0, 8);

  const hasBody =
    sections.description.length > 0 ||
    sections.responsibilities.length > 0 ||
    sections.requirements.length > 0;
  const description = hasBody
    ? sections.description
    : `${title} at ${companyName}, based in ${city} (${loc.workMode.toLowerCase()}). ` +
      `Full details and application are on the original listing.`;

  return {
    id,
    slug: `${slugify(`${title}-${companyName}-${city}`)}-${shortHash(key)}`.replace(/-+/g, "-"),
    title,
    company: {
      id: companyId,
      name: companyName,
      logo: logoFor(domainName, raw.companyLogo),
      domain: domainName,
    },
    location: { city, country: "India" },
    workMode: loc.workMode,
    employmentType,
    experienceLevel: level,
    experienceMin: years.min,
    experienceMax: years.max,
    domain,
    skills,
    tags,
    description,
    responsibilities: sections.responsibilities,
    requirements: sections.requirements,
    preferred: sections.preferred,
    salary: raw.salary ?? null,
    source: raw.source,
    applyUrl: raw.applyUrl,
    postedAt,
    firstSeenAt: now,
    lastSeenAt: now,
    status: "Active",
  };
}

function buildCompanies(jobs: Job[]): Company[] {
  const byId = new Map<string, Company>();
  for (const j of jobs) {
    if (j.status !== "Active") continue;
    const existing = byId.get(j.company.id);
    if (existing) {
      if (!existing.locations.includes(j.location.city))
        existing.locations.push(j.location.city);
      continue;
    }
    const seed = SEED_COMPANIES.find(
      (c) => c.name.toLowerCase() === j.company.name.toLowerCase(),
    );
    byId.set(j.company.id, {
      id: j.company.id,
      name: j.company.name,
      logo: j.company.logo,
      domain: j.company.domain,
      website: j.company.domain ? `https://${j.company.domain}` : null,
      industry: seed?.industry ?? null,
      companySize: seed?.size ?? null,
      description: seed
        ? `${seed.name} is a ${seed.industry.toLowerCase()} company hiring product managers in India.`
        : null,
      locations: [j.location.city],
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function loadExisting(): Promise<JobsDataset> {
  try {
    const txt = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(txt) as JobsDataset;
    if (Array.isArray(parsed.jobs)) return parsed;
  } catch {
    /* first run */
  }
  return { generatedAt: new Date(0).toISOString(), jobs: [], companies: [] };
}

async function main() {
  const now = new Date().toISOString();
  console.log(`\nPM Dream Job · ingestion run @ ${now}`);

  const existing = await loadExisting();
  const existingById = new Map(existing.jobs.map((j) => [j.id, j]));

  console.log("\nFetching sources…");
  const [muse, remotive, ats] = await Promise.all([
    fromTheMuse().catch((e) => (console.warn("themuse failed", e), [] as RawJob[])),
    fromRemotive().catch((e) => (console.warn("remotive failed", e), [] as RawJob[])),
    fromAtsBoards().catch((e) => (console.warn("ats failed", e), [] as RawJob[])),
  ]);
  console.log(`\n  The Muse: ${muse.length} · Remotive: ${remotive.length} · ATS boards: ${ats.length}`);

  const normalized: Job[] = [];
  for (const raw of [...ats, ...muse, ...remotive]) {
    if (!raw.applyUrl) continue;
    const job = normalize(raw, now);
    if (job) normalized.push(job);
  }

  // De-duplicate across sources: keep the highest-ranked / richest listing.
  const best = new Map<string, Job>();
  for (const job of normalized) {
    const k = job.id;
    const cur = best.get(k);
    if (
      !cur ||
      rankOf(job.source) > rankOf(cur.source) ||
      (rankOf(job.source) === rankOf(cur.source) &&
        job.description.length > cur.description.length)
    ) {
      best.set(k, job);
    }
  }

  const seenNow = new Set(best.keys());
  const merged: Job[] = [];

  // Fresh + updated jobs
  for (const job of best.values()) {
    const prev = existingById.get(job.id);
    merged.push({
      ...job,
      firstSeenAt: prev?.firstSeenAt ?? job.firstSeenAt,
      postedAt: prev?.postedAt ?? job.postedAt,
    });
  }

  // Carry forward jobs not seen this run, expiring / dropping stale ones.
  let expired = 0;
  let dropped = 0;
  for (const prev of existing.jobs) {
    if (seenNow.has(prev.id)) continue;
    const age = Date.now() - new Date(prev.lastSeenAt).getTime();
    if (age > DROP_AFTER_MS) {
      dropped++;
      continue;
    }
    merged.push({
      ...prev,
      status: age > EXPIRE_AFTER_MS ? "Expired" : prev.status,
    });
    if (age > EXPIRE_AFTER_MS) expired++;
  }

  merged.sort(
    (a, b) =>
      b.postedAt.localeCompare(a.postedAt) || a.title.localeCompare(b.title),
  );

  const activeJobs = merged.filter((j) => j.status === "Active");
  const companies = buildCompanies(merged);

  const dataset: JobsDataset = {
    generatedAt: now,
    jobs: merged,
    companies,
  };

  await writeFile(DATA_FILE, JSON.stringify(dataset, null, 2) + "\n", "utf8");

  console.log(
    `\nDone. ${activeJobs.length} active jobs · ${companies.length} companies` +
      ` · ${expired} expired · ${dropped} dropped · ${merged.length} total rows\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
