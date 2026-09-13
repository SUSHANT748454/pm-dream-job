/**
 * Companies whose public job board (Greenhouse / Lever / Ashby) we read without
 * an API key. Every `slug` here returned at least one India-based Product
 * Manager role when last checked (2026-09-11). A slug that later breaks just
 * 404s and is skipped — safe to extend.
 *
 * New candidates come from two places: manual research (verify a slug with
 * `curl https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true`
 * or the Lever/Ashby equivalents in src/lib for those two providers) and the
 * public "suggest a company" form at /suggest-company, which lands in the
 * Supabase `company_suggestions` table for review.
 */

import type { Domain } from "../../src/types/job.ts";

export type Ats = "greenhouse" | "lever" | "ashby" | "workday";

export interface SeedCompany {
  name: string;
  domain: string;
  ats: Ats;
  /** Board slug — for Workday this is the tenant (e.g. "adobe"). */
  slug: string;
  /** Workday only: the wd number in `{tenant}.wd{N}.myworkdayjobs.com`. */
  wd?: number;
  /** Workday only: the career-site path segment (e.g. "external_experienced"). */
  site?: string;
  industry: string;
  size?: string;
  domains: Domain[];
}

export const SEED_COMPANIES: SeedCompany[] = [
  // ---------------- Greenhouse ----------------
  { name: "Razorpay", domain: "razorpay.com", ats: "greenhouse", slug: "razorpaysoftwareprivatelimited", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "SaaS"] },
  { name: "Groww", domain: "groww.in", ats: "greenhouse", slug: "groww", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "Consumer"] },
  { name: "Postman", domain: "postman.com", ats: "greenhouse", slug: "postman", industry: "Developer Tools", size: "1000-5000", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "slice", domain: "sliceit.com", ats: "greenhouse", slug: "slice", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "Consumer"] },
  { name: "Porter", domain: "porter.in", ats: "greenhouse", slug: "porter", industry: "Logistics", size: "1000-5000", domains: ["Logistics", "Consumer"] },
  { name: "BlueStone", domain: "bluestone.com", ats: "greenhouse", slug: "bluestone", industry: "Ecommerce", size: "1000-5000", domains: ["Ecommerce", "Consumer"] },
  { name: "Stripe", domain: "stripe.com", ats: "greenhouse", slug: "stripe", industry: "Fintech", size: "5000+", domains: ["Fintech", "SaaS", "Enterprise"] },
  { name: "Affirm", domain: "affirm.com", ats: "greenhouse", slug: "affirm", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "Consumer"] },
  { name: "Coinbase", domain: "coinbase.com", ats: "greenhouse", slug: "coinbase", industry: "Fintech", size: "5000+", domains: ["Fintech", "Consumer"] },
  { name: "Instacart", domain: "instacart.com", ats: "greenhouse", slug: "instacart", industry: "Ecommerce", size: "5000+", domains: ["Ecommerce", "Logistics", "Consumer"] },
  { name: "GitLab", domain: "gitlab.com", ats: "greenhouse", slug: "gitlab", industry: "Developer Tools", size: "1000-5000", domains: ["SaaS", "Enterprise"] },
  { name: "Reddit", domain: "reddit.com", ats: "greenhouse", slug: "reddit", industry: "Social", size: "1000-5000", domains: ["Consumer"] },
  { name: "Pinterest", domain: "pinterest.com", ats: "greenhouse", slug: "pinterest", industry: "Social", size: "1000-5000", domains: ["Consumer", "Ecommerce"] },
  { name: "Smartsheet", domain: "smartsheet.com", ats: "greenhouse", slug: "smartsheet", industry: "SaaS", size: "1000-5000", domains: ["SaaS", "Enterprise"] },
  { name: "Glean", domain: "glean.com", ats: "greenhouse", slug: "gleanwork", industry: "AI", size: "500-1000", domains: ["AI", "Enterprise", "SaaS"] },
  { name: "Toast", domain: "toasttab.com", ats: "greenhouse", slug: "toast", industry: "Fintech", size: "5000+", domains: ["Fintech", "SaaS"] },
  { name: "Anthropic", domain: "anthropic.com", ats: "greenhouse", slug: "anthropic", industry: "AI", size: "1000-5000", domains: ["AI", "Enterprise"] },
  { name: "Sumo Logic", domain: "sumologic.com", ats: "greenhouse", slug: "sumologic", industry: "SaaS", size: "1000-5000", domains: ["SaaS", "Enterprise"] },
  { name: "MongoDB", domain: "mongodb.com", ats: "greenhouse", slug: "mongodb", industry: "Developer Tools", size: "5000+", domains: ["SaaS", "Enterprise"] },
  { name: "Airbnb", domain: "airbnb.com", ats: "greenhouse", slug: "airbnb", industry: "Travel", size: "5000+", domains: ["Consumer"] },
  { name: "Zscaler", domain: "zscaler.com", ats: "greenhouse", slug: "zscaler", industry: "Security", size: "5000+", domains: ["Enterprise", "SaaS"] },
  { name: "Rubrik", domain: "rubrik.com", ats: "greenhouse", slug: "rubrik", industry: "Enterprise", size: "1000-5000", domains: ["Enterprise", "SaaS"] },
  { name: "Karat", domain: "karat.com", ats: "greenhouse", slug: "karat", industry: "HR Tech", size: "500-1000", domains: ["SaaS", "Enterprise"] },
  { name: "Karya", domain: "karya.in", ats: "greenhouse", slug: "karya", industry: "AI", size: "50-100", domains: ["AI", "Consumer"] },
  { name: "Commvault", domain: "commvault.com", ats: "greenhouse", slug: "commvault", industry: "Enterprise", size: "1000-5000", domains: ["Enterprise", "SaaS"] },
  { name: "Truecaller", domain: "truecaller.com", ats: "greenhouse", slug: "truecaller", industry: "Consumer Tech", size: "1000-5000", domains: ["Consumer", "AI"] },
  { name: "Druva", domain: "druva.com", ats: "greenhouse", slug: "druva", industry: "Data Protection", size: "1000-5000", domains: ["SaaS", "Enterprise"] },
  { name: "Zenoti", domain: "zenoti.com", ats: "greenhouse", slug: "zenoti", industry: "Vertical SaaS", size: "1000-5000", domains: ["SaaS", "Consumer"] },
  { name: "InMobi", domain: "inmobi.com", ats: "greenhouse", slug: "inmobi", industry: "AdTech", size: "1000-5000", domains: ["Consumer", "AI"] },
  { name: "Okta", domain: "okta.com", ats: "greenhouse", slug: "okta", industry: "Security", size: "5000+", domains: ["Enterprise", "SaaS"] },
  { name: "ZoomInfo", domain: "zoominfo.com", ats: "greenhouse", slug: "zoominfo", industry: "SaaS", size: "1000-5000", domains: ["SaaS", "Enterprise"] },
  { name: "HighRadius", domain: "highradius.com", ats: "greenhouse", slug: "highradius", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "SaaS", "Enterprise"] },

  // ---------------- Lever ----------------
  { name: "Paytm", domain: "paytm.com", ats: "lever", slug: "paytm", industry: "Fintech", size: "5000+", domains: ["Fintech", "Consumer"] },
  { name: "Meesho", domain: "meesho.com", ats: "lever", slug: "meesho", industry: "Ecommerce", size: "1000-5000", domains: ["Ecommerce", "Consumer"] },
  { name: "MindTickle", domain: "mindtickle.com", ats: "lever", slug: "mindtickle", industry: "SaaS", size: "500-1000", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "Hevo Data", domain: "hevodata.com", ats: "lever", slug: "hevodata", industry: "Data", size: "100-500", domains: ["SaaS", "Enterprise"] },
  { name: "Saviynt", domain: "saviynt.com", ats: "lever", slug: "saviynt", industry: "Security", size: "1000-5000", domains: ["Enterprise", "SaaS"] },
  { name: "FamPay", domain: "fampay.in", ats: "lever", slug: "fampay", industry: "Fintech", size: "100-500", domains: ["Fintech", "Consumer"] },
  { name: "Warner Music Group", domain: "wmg.com", ats: "lever", slug: "wmg", industry: "Entertainment", size: "5000+", domains: ["Consumer"] },

  // ---------------- Ashby ----------------
  { name: "Navi", domain: "navi.com", ats: "ashby", slug: "navi", industry: "Fintech", size: "1000-5000", domains: ["Fintech", "Consumer"] },
  { name: "SpotDraft", domain: "spotdraft.com", ats: "ashby", slug: "spotdraft", industry: "SaaS", size: "100-500", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "Atlan", domain: "atlan.com", ats: "ashby", slug: "atlan", industry: "Data", size: "100-500", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "Sarvam AI", domain: "sarvam.ai", ats: "ashby", slug: "sarvam", industry: "AI", size: "50-100", domains: ["AI", "Consumer"] },
  { name: "Ema", domain: "ema.co", ats: "ashby", slug: "ema", industry: "AI", size: "100-500", domains: ["AI", "Enterprise"] },
  { name: "Vanta", domain: "vanta.com", ats: "ashby", slug: "vanta", industry: "Security", size: "500-1000", domains: ["SaaS", "Enterprise"] },
  { name: "Josys", domain: "josys.com", ats: "ashby", slug: "josys", industry: "SaaS", size: "500-1000", domains: ["SaaS", "Enterprise"] },
  { name: "Hex", domain: "hex.tech", ats: "ashby", slug: "hex", industry: "Data", size: "100-500", domains: ["SaaS", "AI", "Enterprise"] },

  // ---------------- Workday ----------------
  // Large enterprises + their India GCCs. `slug` is the Workday tenant; `wd` and
  // `site` come from the career-site URL: {slug}.wd{wd}.myworkdayjobs.com/{site}.
  // The first four were returning India PM roles when last checked (2026-09-13);
  // the rest have verified-working endpoints and are kept so new postings get
  // picked up automatically the week they appear.
  { name: "Mastercard", domain: "mastercard.com", ats: "workday", slug: "mastercard", wd: 1, site: "CorporateCareers", industry: "Fintech", size: "5000+", domains: ["Fintech", "Enterprise"] },
  { name: "eBay", domain: "ebay.com", ats: "workday", slug: "ebay", wd: 5, site: "apply", industry: "Ecommerce", size: "5000+", domains: ["Ecommerce", "Consumer"] },
  { name: "Adobe", domain: "adobe.com", ats: "workday", slug: "adobe", wd: 5, site: "external_experienced", industry: "SaaS", size: "5000+", domains: ["SaaS", "Enterprise", "AI"] },
  { name: "Philips", domain: "philips.com", ats: "workday", slug: "philips", wd: 3, site: "jobs-and-careers", industry: "Healthcare", size: "5000+", domains: ["Healthcare", "Enterprise"] },
  { name: "Autodesk", domain: "autodesk.com", ats: "workday", slug: "autodesk", wd: 1, site: "Ext", industry: "SaaS", size: "5000+", domains: ["SaaS", "Enterprise"] },
  { name: "Gartner", domain: "gartner.com", ats: "workday", slug: "gartner", wd: 5, site: "EXT", industry: "Research", size: "5000+", domains: ["Enterprise", "SaaS"] },
  { name: "Medtronic", domain: "medtronic.com", ats: "workday", slug: "medtronic", wd: 1, site: "MedtronicCareers", industry: "Healthcare", size: "5000+", domains: ["Healthcare", "Enterprise"] },
  { name: "NVIDIA", domain: "nvidia.com", ats: "workday", slug: "nvidia", wd: 5, site: "NVIDIAExternalCareerSite", industry: "AI", size: "5000+", domains: ["AI", "Enterprise"] },
  { name: "Salesforce", domain: "salesforce.com", ats: "workday", slug: "salesforce", wd: 12, site: "External_Career_Site", industry: "SaaS", size: "5000+", domains: ["SaaS", "Enterprise"] },
  { name: "PayPal", domain: "paypal.com", ats: "workday", slug: "paypal", wd: 1, site: "jobs", industry: "Fintech", size: "5000+", domains: ["Fintech", "Consumer"] },
  { name: "Target", domain: "target.com", ats: "workday", slug: "target", wd: 5, site: "targetcareers", industry: "Ecommerce", size: "5000+", domains: ["Ecommerce", "Consumer"] },
  { name: "Micron", domain: "micron.com", ats: "workday", slug: "micron", wd: 1, site: "External", industry: "Semiconductors", size: "5000+", domains: ["Enterprise"] },
  { name: "Cadence", domain: "cadence.com", ats: "workday", slug: "cadence", wd: 1, site: "External_Careers", industry: "EDA", size: "5000+", domains: ["Enterprise", "SaaS"] },
];
