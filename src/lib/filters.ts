import type {
  Domain,
  EmploymentType,
  ExperienceLevel,
  JobSort,
  WorkMode,
} from "@/types/job";

/** India-focused location facet. "Remote" is treated as a location too. */
export const LOCATIONS = [
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Remote",
] as const;

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "APM",
  "Product Manager",
  "Senior Product Manager",
  "Lead Product Manager",
  "Group Product Manager",
  "Director",
];

export const WORK_MODES: WorkMode[] = ["Remote", "Hybrid", "Onsite"];

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "Full Time",
  "Contract",
  "Internship",
];

export const DOMAINS: Domain[] = [
  "Fintech",
  "Ecommerce",
  "SaaS",
  "Consumer",
  "AI",
  "Healthcare",
  "EdTech",
  "Gaming",
  "Logistics",
  "Enterprise",
];

export const SORT_OPTIONS: { value: JobSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "oldest", label: "Oldest" },
  { value: "company", label: "Company A–Z" },
];

export const DEFAULT_SORT: JobSort = "recent";
export const DEFAULT_PAGE_SIZE = 12;

/** The set of filter keys that appear in the URL as repeatable query params. */
export const FILTER_KEYS = [
  "location",
  "experienceLevel",
  "workMode",
  "employmentType",
  "domain",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export const FILTER_LABELS: Record<FilterKey, string> = {
  location: "Location",
  experienceLevel: "Experience level",
  workMode: "Work mode",
  employmentType: "Job type",
  domain: "Domain",
};

export const FILTER_OPTIONS: Record<FilterKey, readonly string[]> = {
  location: LOCATIONS,
  experienceLevel: EXPERIENCE_LEVELS,
  workMode: WORK_MODES,
  employmentType: EMPLOYMENT_TYPES,
  domain: DOMAINS,
};
