import type {
  Domain,
  EmploymentType,
  ExperienceLevel,
  WorkMode,
} from "../../src/types/job.ts";

const INDIA_CITIES: Record<string, string> = {
  bengaluru: "Bengaluru",
  bangalore: "Bengaluru",
  blr: "Bengaluru",
  mumbai: "Mumbai",
  "navi mumbai": "Mumbai",
  pune: "Pune",
  hyderabad: "Hyderabad",
  "hyd": "Hyderabad",
  gurgaon: "Delhi NCR",
  gurugram: "Delhi NCR",
  noida: "Delhi NCR",
  "new delhi": "Delhi NCR",
  delhi: "Delhi NCR",
  "delhi ncr": "Delhi NCR",
  chennai: "Chennai",
  kolkata: "Kolkata",
  ahmedabad: "Ahmedabad",
  jaipur: "Jaipur",
  indore: "Indore",
  chandigarh: "Chandigarh",
  kochi: "Kochi",
  coimbatore: "Coimbatore",
};

const REMOTE_HINTS = /\b(remote|anywhere|work from home|wfh|distributed)\b/i;
const HYBRID_HINTS = /\bhybrid\b/i;

export interface LocationResult {
  city: string;
  country: string;
  workMode: WorkMode;
  /** true when we could tie the role to India (or global-remote). */
  isIndia: boolean;
}

export function resolveLocation(
  rawLocation: string,
  extraText = "",
): LocationResult {
  const loc = (rawLocation || "").toLowerCase();
  const blob = `${loc} ${extraText}`.toLowerCase();

  let city = "";
  for (const [needle, canonical] of Object.entries(INDIA_CITIES)) {
    if (loc.includes(needle)) {
      city = canonical;
      break;
    }
  }

  const mentionsIndia =
    /\bindia\b/i.test(rawLocation) ||
    city !== "" ||
    /\b(bengaluru|bangalore|mumbai|pune|hyderabad|gurgaon|gurugram|noida|new delhi|chennai|kolkata)\b/i.test(
      extraText.slice(0, 300),
    );
  const remote = REMOTE_HINTS.test(loc);
  const hybrid = HYBRID_HINTS.test(loc) || HYBRID_HINTS.test(extraText);

  let workMode: WorkMode = "Onsite";
  if (hybrid) workMode = "Hybrid";
  else if (remote) workMode = "Remote";

  if (!city && remote && mentionsIndia) city = "Remote";

  return {
    city: city || (mentionsIndia ? "India" : ""),
    country: "India",
    // A role only counts as "India" if it explicitly names India or an Indian
    // city somewhere. Generic global-remote listings are dropped.
    isIndia: mentionsIndia,
    workMode,
  };
}

const LEVEL_RULES: [RegExp, ExperienceLevel][] = [
  [/\b(director|head of product|vp product|vice president)\b/i, "Director"],
  [/\b(group product manager|gpm|principal product manager)\b/i, "Group Product Manager"],
  [/\b(lead product manager|product lead|staff product manager)\b/i, "Lead Product Manager"],
  [/\b(senior product manager|sr\.? product manager|senior pm|sr\.? pm)\b/i, "Senior Product Manager"],
  [/\b(associate product manager|apm|product analyst|associate pm)\b/i, "APM"],
];

export function classifyLevel(
  title: string,
  yearsMin: number | null,
): ExperienceLevel {
  for (const [re, level] of LEVEL_RULES) if (re.test(title)) return level;
  if (yearsMin != null) {
    if (yearsMin >= 12) return "Director";
    if (yearsMin >= 9) return "Group Product Manager";
    if (yearsMin >= 7) return "Lead Product Manager";
    if (yearsMin >= 4) return "Senior Product Manager";
    if (yearsMin <= 1) return "APM";
  }
  return "Product Manager";
}

export function extractExperienceYears(
  text: string,
): { min: number | null; max: number | null } {
  const t = text.replace(/\s+/g, " ");
  // "5-8 years", "5 to 8 years", "5+ years", "minimum 6 years"
  const range = t.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*years?/i);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const plus = t.match(/(\d{1,2})\s*\+\s*years?/i);
  if (plus) return { min: Number(plus[1]), max: null };
  const min = t.match(/(?:minimum|at least|min\.?)\s*(?:of\s*)?(\d{1,2})\s*years?/i);
  if (min) return { min: Number(min[1]), max: null };
  const single = t.match(/(\d{1,2})\s*years?\s+(?:of\s+)?(?:relevant\s+)?experience/i);
  if (single) return { min: Number(single[1]), max: null };
  return { min: null, max: null };
}

export function classifyEmployment(
  title: string,
  raw = "",
): EmploymentType {
  const t = `${title} ${raw}`.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "Internship";
  if (/\b(contract|contractor|fixed term|fixed-term|temporary|freelance)\b/.test(t))
    return "Contract";
  return "Full Time";
}

const DOMAIN_RULES: [RegExp, Domain][] = [
  [/\b(fintech|payments?|banking|lending|wealth|insurance|insurtech|trading|upi|neobank)\b/i, "Fintech"],
  [/\b(e-?commerce|marketplace|retail|d2c|shopping|quick commerce|q-commerce)\b/i, "Ecommerce"],
  [/\b(saas|b2b|platform|api|developer tools?|devtools|infrastructure)\b/i, "SaaS"],
  [/\b(consumer|b2c|social|content|creator|community|entertainment|music|video)\b/i, "Consumer"],
  [/\b(\bai\b|artificial intelligence|machine learning|\bml\b|llm|genai|generative)\b/i, "AI"],
  [/\b(health(care)?|medtech|clinical|hospital|pharma|wellness|diagnostics)\b/i, "Healthcare"],
  [/\b(edtech|education|learning|upskilling|e-?learning|course)\b/i, "EdTech"],
  [/\b(gaming|games?|esports|rummy|fantasy sports)\b/i, "Gaming"],
  [/\b(logistics|supply chain|delivery|mobility|fleet|shipping|warehous)\b/i, "Logistics"],
  [/\b(enterprise|erp|crm|procurement|hr tech|workforce|compliance|governance)\b/i, "Enterprise"],
];

export function classifyDomains(text: string, hints: Domain[] = []): Domain[] {
  const scored = new Map<Domain, number>();
  for (const h of hints.slice(0, 2)) scored.set(h, (scored.get(h) ?? 0) + 2);
  for (const [re, domain] of DOMAIN_RULES) {
    const matches = text.match(new RegExp(re, "gi"));
    if (matches) scored.set(domain, (scored.get(domain) ?? 0) + matches.length);
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
}

const SKILL_DICTIONARY = [
  "Product Strategy", "Roadmapping", "A/B Testing", "Experimentation", "SQL",
  "Analytics", "User Research", "Wireframing", "Go-to-Market", "Growth",
  "Monetization", "Pricing", "API", "Platform", "Data", "Machine Learning",
  "Mobile", "iOS", "Android", "B2B", "B2C", "Payments", "Fraud", "Onboarding",
  "Retention", "Personalization", "Marketplace", "Supply", "Demand",
  "Stakeholder Management", "Agile", "Scrum", "Figma", "Amplitude", "Mixpanel",
  "Segmentation", "Funnel Optimization", "OKRs", "P&L", "Compliance",
];

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_DICTIONARY.filter((s) => lower.includes(s.toLowerCase())).slice(0, 10);
}

/** Repair the common UTF-8-decoded-as-Latin-1 mojibake seen in aggregator feeds. */
export function fixMojibake(s: string): string {
  if (!/Ã|â€|Â/.test(s)) return s;
  return s
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€"/g, "—")
    .replace(/â€"/g, "–")
    .replace(/â€¦/g, "…")
    .replace(/â€¢/g, "•")
    .replace(/Â /g, " ")
    .replace(/Â/g, "")
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è");
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&lsquo;|&apos;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&hellip;/gi, "…")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&bull;/gi, "•")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/gi, "&");
}

export function stripHtml(html: string): string {
  return decodeEntities(
    fixMojibake(html)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      // force a line break around block + emphasis boundaries so run-together
      // "Heading<ul><li>…" becomes its own line
      .replace(/<(ul|ol|p|div|h[1-6]|table)[^>]*>/gi, "\n")
      .replace(/<\/(b|strong|h[1-6])>/gi, "\n")
      .replace(/<(b|strong)>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const BOILERPLATE_HEADING =
  /^(benefits|perks|what we offer|compensation|salary|our benefits|equal opportunity|eeo|about us|about the company|about \w+|who we are|why join|life at|our culture|note for current employees|diversity)/i;

/** Split a plain-text JD into the four sections the details page renders. */
export function sectionize(text: string): {
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
} {
  const lines = text.split("\n").map((l) => l.trim());
  const bucket = { description: [] as string[], responsibilities: [] as string[], requirements: [] as string[], preferred: [] as string[] };
  let current: keyof typeof bucket = "description";

  let stopped = false;
  for (const line of lines) {
    if (!line || stopped) continue;
    const h = line.toLowerCase().replace(/[:*#\-•\s]+$/g, "").trim();
    const isHeading = line.length < 80;

    if (isHeading && BOILERPLATE_HEADING.test(h)) {
      // everything past benefits / EEO / "about us" is boilerplate
      stopped = true;
      continue;
    }
    if (isHeading && /(what you.?ll do|responsibilities|the role|your impact|key responsibilities|in this role|what you.?ll be doing|day to day)/.test(h)) {
      current = "responsibilities";
      continue;
    }
    if (isHeading && /(what we.?re looking for|requirements|qualifications|what you.?ll need|you have|must have|about you|who you are|what you bring|you.?ll need|skills? (and|&) experience)/.test(h)) {
      current = "requirements";
      continue;
    }
    if (isHeading && /(nice to have|bonus|preferred|good to have|pluses|extra credit)/.test(h)) {
      current = "preferred";
      continue;
    }
    const clean = line.replace(/^[•\-*·]\s*/, "").trim();
    if (!clean || clean.length < 3) continue;
    if (current === "description") bucket.description.push(clean);
    else bucket[current].push(clean);
  }

  return {
    description: bucket.description.join("\n\n").slice(0, 4000) || text.slice(0, 1200),
    responsibilities: bucket.responsibilities.slice(0, 12),
    requirements: bucket.requirements.slice(0, 12),
    preferred: bucket.preferred.slice(0, 8),
  };
}
