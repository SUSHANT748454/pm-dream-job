/**
 * Canonical data model for PM Dream Job.
 *
 * The MVP reads this shape from a generated JSON file (`src/data/jobs.json`),
 * but it is defined as if it will later be served by an API / database so the
 * UI never has to change when the backend arrives.
 */

export type WorkMode = "Remote" | "Hybrid" | "Onsite";

export type EmploymentType = "Full Time" | "Contract" | "Internship";

/** Normalised PM seniority ladder used for the Experience filter. */
export type ExperienceLevel =
  | "APM"
  | "Product Manager"
  | "Senior Product Manager"
  | "Lead Product Manager"
  | "Group Product Manager"
  | "Director";

export type Domain =
  | "Fintech"
  | "Ecommerce"
  | "SaaS"
  | "Consumer"
  | "AI"
  | "Healthcare"
  | "EdTech"
  | "Gaming"
  | "Logistics"
  | "Enterprise";

export type JobStatus = "Active" | "Expired" | "Closed" | "Draft";

export interface CompanyRef {
  id: string;
  name: string;
  /** Logo URL (may be an external host); the UI falls back to a monogram. */
  logo: string | null;
  /** Primary web domain, e.g. "razorpay.com" — used for logo + linking. */
  domain: string | null;
}

export interface Company extends CompanyRef {
  website: string | null;
  industry: string | null;
  companySize: string | null;
  /** Short description shown on the company page. */
  description: string | null;
  /** Cities in India where this company has listings on the board. */
  locations: string[];
}

export interface JobLocation {
  /** e.g. "Bengaluru". "Remote" when the role is location-independent. */
  city: string;
  country: string;
}

export interface JobSalary {
  min: number | null;
  max: number | null;
  currency: string;
  /** e.g. "year" | "month" */
  period: string | null;
}

export interface Job {
  id: string;
  /** URL-safe, human-readable, unique. e.g. "senior-product-manager-razorpay-bengaluru-a1b2c3". */
  slug: string;

  title: string;
  company: CompanyRef;
  location: JobLocation;

  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  experienceMin: number | null;
  experienceMax: number | null;

  domain: Domain[];
  skills: string[];
  tags: string[];

  /** Plain-text or lightly-formatted description (may contain \n\n paragraphs). */
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];

  salary: JobSalary | null;

  /** Where the listing was ingested from, e.g. "The Muse", "Greenhouse · Razorpay". */
  source: string;
  /** The original application URL the "Apply" button points to. */
  applyUrl: string;

  /** ISO date (YYYY-MM-DD). */
  postedAt: string;
  /** ISO timestamp of when the ingester first saw this job. */
  firstSeenAt: string;
  /** ISO timestamp of the most recent refresh that still saw this job. */
  lastSeenAt: string;

  status: JobStatus;
}

/** Shape of the generated data file. */
export interface JobsDataset {
  /** ISO timestamp of the ingestion run that produced this file. */
  generatedAt: string;
  jobs: Job[];
  companies: Company[];
}

/** Filters accepted by the job service / listing page. */
export interface JobQuery {
  q?: string;
  location?: string[];
  experienceLevel?: ExperienceLevel[];
  workMode?: WorkMode[];
  employmentType?: EmploymentType[];
  domain?: Domain[];
  sort?: JobSort;
  page?: number;
  pageSize?: number;
}

export type JobSort = "recent" | "oldest" | "company";

export interface JobQueryResult {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BoardStats {
  activeJobs: number;
  companies: number;
  newThisWeek: number;
}
