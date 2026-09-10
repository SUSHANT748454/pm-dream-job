import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";

import { getCompanyBySlug, getCompanies } from "@/services/jobService";
import { pluralize } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/job-card";
import { TrackView } from "@/components/analytics/track-view";
import { ProfileBanner } from "@/components/profile-banner";

export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: c.id }));
}

export const dynamicParams = true;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const data = getCompanyBySlug(slug);
  if (!data) return { title: "Company not found" };
  return {
    title: `${data.company.name} — Product Manager jobs`,
    description: `${data.jobs.length} open Product Management ${
      data.jobs.length === 1 ? "role" : "roles"
    } at ${data.company.name} in India.`,
    alternates: { canonical: `/companies/${data.company.id}` },
  };
}

export default async function CompanyPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const data = getCompanyBySlug(slug);
  if (!data) notFound();
  const { company, jobs } = data;

  return (
    <div className="container-page py-10">
      <TrackView
        event={{ name: "page_viewed", props: { path: `/companies/${company.id}` } }}
      />

      <ProfileBanner returnTo={`/companies/${company.id}`} />

      <Link
        href="/companies"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        All companies
      </Link>

      <header className="mt-6 flex items-start gap-5">
        <Logo name={company.name} src={company.logo} size={64} />
        <div>
          <h1 className="font-display text-3xl tracking-tight text-text">
            {company.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            {company.industry && <Badge tone="outline">{company.industry}</Badge>}
            {company.companySize && (
              <Badge tone="outline">{company.companySize} employees</Badge>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 hover:text-text"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </a>
            )}
          </div>
          {company.description && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
              {company.description}
            </p>
          )}
        </div>
      </header>

      <h2 className="mt-10 font-display text-xl text-text">
        {pluralize(jobs.length, "open role")}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
