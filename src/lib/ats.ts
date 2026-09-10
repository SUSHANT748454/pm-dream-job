import type { Job } from "@/types/job";
import type { ExperienceBand } from "@/lib/profile";

/**
 * On-device ATS-style match score. This is NOT a language model judgement — it's
 * a deterministic keyword / skills overlap between the résumé text and the job
 * description, the same mechanism a real ATS keyword filter uses. Everything
 * runs in the browser; nothing is uploaded.
 */

export type MatchBand = "high" | "medium" | "low";

export interface MatchResult {
  /** 0–100 */
  score: number;
  band: MatchBand;
  /** JD terms found in the résumé (most important first). */
  matched: string[];
  /** JD terms missing from the résumé (most important first). */
  missing: string[];
}

export const BAND_LABEL: Record<MatchBand, string> = {
  high: "High match",
  medium: "Medium match",
  low: "Low match",
};

/** Buckets: 0–60 Low · 60–80 Medium · 80+ High. */
export function toBand(score: number): MatchBand {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "your", "that", "this",
  "have", "has", "from", "not", "but", "all", "can", "who", "how", "why", "what",
  "a", "an", "of", "to", "in", "on", "at", "as", "is", "it", "be", "or", "by", "we",
  "us", "i", "they", "them", "their", "his", "her", "its", "into", "out", "up",
  "work", "working", "team", "teams", "role", "job", "help", "across", "using",
  "years", "year", "experience", "including", "etc", "e", "g", "ie", "eg", "per",
  "strong", "good", "great", "ability", "skills", "skill", "plus", "must", "should",
  "well", "more", "than", "over", "also", "new", "like", "such", "within", "while",
  "about", "which", "when", "where", "other", "some", "any", "each", "many", "most",
  "product", "manager", "management", "pm",
]);

const TOKEN_RE = /[a-z][a-z0-9+#.]*[a-z0-9+#]|[a-z]/g;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).filter(
    (t) => t.length >= 2 && !STOPWORDS.has(t),
  );
}

/** Tokens + adjacent bigrams, so phrases like "user research" are matched too. */
function terms(text: string): Set<string> {
  const toks = tokenize(text);
  const set = new Set(toks);
  for (let i = 0; i < toks.length - 1; i++) set.add(`${toks[i]} ${toks[i + 1]}`);
  return set;
}

/** Précompute the résumé's term set once, then reuse it for every job. */
export function resumeTerms(resumeText: string): Set<string> {
  return terms(resumeText);
}

const BAND_YEARS: Record<ExperienceBand, [number, number]> = {
  "0-2 years": [0, 2],
  "2-5 years": [2, 5],
  "5-8 years": [5, 8],
  "8-12 years": [8, 12],
  "12+ years": [12, 99],
};

function experienceScore(band: ExperienceBand | undefined, job: Job): number {
  if (!band || (job.experienceMin == null && job.experienceMax == null)) return 0.8;
  const [lo, hi] = BAND_YEARS[band];
  const jLo = job.experienceMin ?? 0;
  const jHi = job.experienceMax ?? jLo + 4;
  const overlaps = lo <= jHi && hi >= jLo;
  if (overlaps) return 1;
  const gap = lo > jHi ? lo - jHi : jLo - hi;
  return gap <= 2 ? 0.6 : 0.3;
}

interface WeightedTerm {
  term: string;
  weight: number;
  /** display label (original casing) */
  label: string;
}

/** Build the weighted keyword set the JD is scored on. */
function jobKeywords(job: Job): WeightedTerm[] {
  const map = new Map<string, WeightedTerm>();
  const add = (raw: string, weight: number) => {
    const key = raw.toLowerCase().trim();
    if (!key || key.length < 2 || STOPWORDS.has(key)) return;
    const prev = map.get(key);
    if (prev) prev.weight = Math.max(prev.weight, weight);
    else map.set(key, { term: key, weight, label: raw.trim() });
  };

  for (const s of job.skills) add(s, 3);
  for (const d of job.domain) add(d, 2.5);
  for (const t of job.tags) add(t, 2);
  for (const t of tokenize(job.title)) add(t, 2);
  for (const line of [...job.requirements, ...job.preferred])
    for (const t of tokenize(line)) add(t, 1.6);
  for (const line of job.responsibilities)
    for (const t of tokenize(line)) add(t, 1);

  return [...map.values()].sort((a, b) => b.weight - a.weight).slice(0, 45);
}

/** Score one job against a précomputed résumé term set. */
export function scoreJob(
  cvTerms: Set<string>,
  job: Job,
  band?: ExperienceBand,
): MatchResult {
  const kws = jobKeywords(job);
  const skillKws = kws.filter((k) => k.weight >= 2.5);

  const hit = (t: string) => cvTerms.has(t);

  const cover = (list: WeightedTerm[]) => {
    if (list.length === 0) return { ratio: 1, matched: [], missing: [] };
    let got = 0;
    let total = 0;
    const matched: string[] = [];
    const missing: string[] = [];
    for (const k of list) {
      total += k.weight;
      if (hit(k.term)) {
        got += k.weight;
        matched.push(k.label);
      } else {
        missing.push(k.label);
      }
    }
    return { ratio: got / total, matched, missing };
  };

  const skills = cover(skillKws);
  const keywords = cover(kws);
  const exp = experienceScore(band, job);

  const raw =
    0.45 * skills.ratio +
    0.30 * keywords.ratio +
    0.1 * (job.domain.length ? domainRatio(cvTerms, job) : keywords.ratio) +
    0.15 * exp;

  // Gentle curve so a solid keyword match lands in a familiar ATS range.
  const score = Math.round(Math.min(100, Math.max(0, raw * 100 * 1.08)));

  // Chips shown to the user come only from the curated fields (skills / domain /
  // meaningful tags) — never raw tokens from prose, and never work-mode /
  // seniority labels, which aren't things to "add to a résumé".
  const NON_SKILL = new Set([
    "remote", "hybrid", "onsite", "apm", "full time", "contract", "internship",
    "product manager", "senior product manager", "lead product manager",
    "group product manager", "director", "india",
  ]);
  const display = dedupe([
    ...job.skills,
    ...job.domain,
    ...job.tags.filter((t) => /^[a-z][a-z0-9 /+.-]{1,}$/i.test(t)),
  ]).filter((t) => !NON_SKILL.has(t.toLowerCase()));

  const matched: string[] = [];
  const missing: string[] = [];
  for (const label of display) {
    (cvTerms.has(label.toLowerCase()) ? matched : missing).push(label);
  }

  return {
    score,
    band: toBand(score),
    matched: matched.slice(0, 12),
    missing: missing.slice(0, 12),
  };
}

function domainRatio(cvTerms: Set<string>, job: Job): number {
  if (!job.domain.length) return 1;
  const got = job.domain.filter((d) => cvTerms.has(d.toLowerCase())).length;
  return got / job.domain.length;
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const k = item.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
