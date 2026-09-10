/**
 * Curated companies with an India presence that hire Product Managers, plus the
 * public job-board (ATS) endpoint we can read without an API key.
 *
 * `slug` is the token in the ATS URL. A wrong token just 404s and that company
 * is skipped, so this list is safe to extend over time.
 *
 * Tokens marked "verified" returned jobs on 2026-09-10.
 */

import type { Domain } from "../../src/types/job.ts";

export type Ats = "greenhouse" | "lever" | "ashby";

export interface SeedCompany {
  name: string;
  domain: string;
  ats: Ats;
  slug: string;
  industry: string;
  size?: string;
  domains: Domain[];
}

export const SEED_COMPANIES: SeedCompany[] = [
  // --- Greenhouse (verified tokens) ---
  { name: "Razorpay", domain: "razorpay.com", ats: "greenhouse", slug: "razorpaysoftwareprivatelimited", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "SaaS"] },
  { name: "Groww", domain: "groww.in", ats: "greenhouse", slug: "groww", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "Consumer"] },
  { name: "Postman", domain: "postman.com", ats: "greenhouse", slug: "postman", industry: "Developer Tools", size: "1000-5000", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "slice", domain: "sliceit.com", ats: "greenhouse", slug: "slice", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "Consumer"] },
  { name: "Porter", domain: "porter.in", ats: "greenhouse", slug: "porter", industry: "Logistics", size: "1000-5000", domains: ["Logistics", "Consumer"] },
  { name: "BlueStone", domain: "bluestone.com", ats: "greenhouse", slug: "bluestone", industry: "Ecommerce", size: "1000-5000", domains: ["Ecommerce", "Consumer"] },

  // --- Greenhouse (best-effort tokens) ---
  { name: "Meesho", domain: "meesho.com", ats: "greenhouse", slug: "meeshoexternal", industry: "Ecommerce", size: "1000-5000", domains: ["Ecommerce", "Consumer"] },
  { name: "Sprinto", domain: "sprinto.com", ats: "greenhouse", slug: "sprintohq", industry: "SaaS", size: "100-500", domains: ["SaaS", "Enterprise"] },
  { name: "MoEngage", domain: "moengage.com", ats: "greenhouse", slug: "moengage", industry: "SaaS", size: "500-1000", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "Whatfix", domain: "whatfix.com", ats: "greenhouse", slug: "whatfix", industry: "SaaS", size: "500-1000", domains: ["SaaS", "Enterprise"] },

  // --- Ashby (verified tokens) ---
  { name: "Navi", domain: "navi.com", ats: "ashby", slug: "navi", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "Consumer"] },
  { name: "SpotDraft", domain: "spotdraft.com", ats: "ashby", slug: "spotdraft", industry: "SaaS", size: "100-500", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "Atlan", domain: "atlan.com", ats: "ashby", slug: "atlan", industry: "Data", size: "100-500", domains: ["SaaS", "Enterprise", "AI"] },

  // --- Ashby (best-effort tokens) ---
  { name: "Fi Money", domain: "fi.money", ats: "ashby", slug: "epifi", industry: "Fintech", size: "500-1000", domains: ["Fintech", "Consumer"] },
  { name: "Zluri", domain: "zluri.com", ats: "ashby", slug: "zluri", industry: "SaaS", size: "100-500", domains: ["SaaS", "Enterprise"] },
  { name: "SuperOps", domain: "superops.com", ats: "ashby", slug: "superops", industry: "SaaS", size: "100-500", domains: ["SaaS", "Enterprise"] },

  // --- Lever (best-effort tokens) ---
  { name: "Spinny", domain: "spinny.com", ats: "lever", slug: "spinny", industry: "Ecommerce", size: "1000-5000", domains: ["Ecommerce", "Consumer"] },
  { name: "Classplus", domain: "classplusapp.com", ats: "lever", slug: "classplus", industry: "EdTech", size: "500-1000", domains: ["EdTech", "SaaS"] },
  { name: "LeadSquared", domain: "leadsquared.com", ats: "lever", slug: "leadsquared", industry: "SaaS", size: "500-1000", domains: ["SaaS", "Enterprise"] },
];
