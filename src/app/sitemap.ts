import type { MetadataRoute } from "next";

import {
  getAllActiveJobSlugs,
  getCompanies,
  getGeneratedAt,
} from "@/services/jobService";
import { siteUrl } from "@/lib/site-url";

const BASE = siteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(
    getGeneratedAt().startsWith("1970") ? Date.now() : getGeneratedAt(),
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1, changeFrequency: "daily" },
    { url: `${BASE}/jobs`, priority: 0.9, changeFrequency: "hourly", lastModified },
    { url: `${BASE}/companies`, priority: 0.7, changeFrequency: "daily", lastModified },
    { url: `${BASE}/about`, priority: 0.3, changeFrequency: "monthly" },
  ];

  const jobRoutes: MetadataRoute.Sitemap = getAllActiveJobSlugs().map((slug) => ({
    url: `${BASE}/jobs/${slug}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const companyRoutes: MetadataRoute.Sitemap = getCompanies().map((c) => ({
    url: `${BASE}/companies/${c.id}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  return [...staticRoutes, ...jobRoutes, ...companyRoutes];
}
