import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getCompanies, getCompanyOpenCounts } from "@/services/jobService";
import { CompanyCard } from "@/components/company-card";
import { TrackView } from "@/components/analytics/track-view";
import { EmptyState } from "@/components/empty-state";
import { ProfileBanner } from "@/components/profile-banner";

export const metadata: Metadata = {
  title: "Companies hiring Product Managers in India",
  description:
    "Browse companies with open Product Management roles in India and see how many they're hiring for.",
  alternates: { canonical: "/companies" },
};

export default function CompaniesPage() {
  const companies = getCompanies();
  const openByCompany = getCompanyOpenCounts();

  return (
    <div className="container-page py-10">
      <TrackView event={{ name: "page_viewed", props: { path: "/companies" } }} />

      <ProfileBanner returnTo="/companies" />

      <header className="max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight text-text">
          Companies hiring Product Managers
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {companies.length} companies with open PM roles in India right now.
        </p>
      </header>

      {companies.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No companies yet"
            hint="The next refresh will populate this page."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <CompanyCard
              key={c.id}
              company={c}
              openRoles={openByCompany.get(c.id) ?? 0}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-center">
        <Link
          href="/suggest-company"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
        >
          Don&apos;t see a company that&apos;s hiring PMs?
          <span className="text-gold-soft">Suggest it</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
