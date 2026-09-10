import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Building2,
  Briefcase,
  Clock3,
  BarChart3,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";

import {
  getJobBySlug,
  getAllActiveJobSlugs,
  getRelatedJobs,
} from "@/services/jobService";
import { relativeDate, formatSalary } from "@/lib/utils";
import type { Job } from "@/types/job";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { ApplyButton } from "@/components/apply-button";
import { JobCard } from "@/components/job-card";
import { TrackView } from "@/components/analytics/track-view";
import { ProfileBanner } from "@/components/profile-banner";
import { MatchBreakdown } from "@/components/match-breakdown";

export function generateStaticParams() {
  return getAllActiveJobSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const job = getJobBySlug(slug);
  if (!job) return { title: "Job not found" };
  const title = `${job.title} at ${job.company.name}`;
  const blurb = job.description
    .replace(
      /^(job requisition id|requisition id|req\.? id|posting id|job id|position id)\b[\s\S]*?(\n\n|$)/i,
      "",
    )
    .replace(/^[A-Z0-9][A-Z0-9\-]{4,14}\s*(\n\n|$)/, "") // bare req/id code line
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
  const description = `${job.experienceLevel} · ${job.location.city} · ${job.workMode}.${blurb ? ` ${blurb}` : ""}`;
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: { title, description, type: "article" },
  };
}

function KeyFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-text-faint">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-sm text-text">{value}</p>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl text-text">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-text-muted">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function JobJsonLd({ job }: { job: Job }) {
  const data = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.postedAt,
    employmentType: job.employmentType.toUpperCase().replace(" ", "_"),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name,
      ...(job.company.domain ? { sameAs: `https://${job.company.domain}` } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.city,
        addressCountry: "IN",
      },
    },
    ...(job.workMode === "Remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
    directApply: false,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function JobDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const related = getRelatedJobs(job, 4);
  const salary = formatSalary(job.salary);
  const expValue =
    job.experienceMin != null
      ? `${job.experienceMin}${job.experienceMax ? `–${job.experienceMax}` : "+"} years`
      : "Not specified";

  return (
    <div className="container-page py-10">
      <JobJsonLd job={job} />
      <TrackView
        event={{
          name: "job_details_viewed",
          props: { jobId: job.id, slug: job.slug, company: job.company.name },
        }}
      />

      <ProfileBanner returnTo={`/jobs/${job.slug}`} />

      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        All jobs
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Logo name={job.company.name} src={job.company.logo} size={60} />
            <div className="min-w-0">
              <h1 className="font-display text-[26px] leading-tight tracking-tight text-text sm:text-3xl">
                {job.title}
              </h1>
              <p className="mt-1 text-text-muted">
                <Link
                  href={`/companies/${job.company.id}`}
                  className="hover:text-text"
                >
                  {job.company.name}
                </Link>
                <span className="mx-1.5 text-text-faint">·</span>
                {job.location.city}
                <span className="mx-1.5 text-text-faint">·</span>
                {job.workMode}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="gold">{job.experienceLevel}</Badge>
                {job.domain.map((d) => (
                  <Badge key={d} tone="outline">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Key facts */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KeyFact icon={Briefcase} label="Experience" value={expValue} />
            <KeyFact icon={Clock3} label="Employment" value={job.employmentType} />
            <KeyFact icon={Building2} label="Work mode" value={job.workMode} />
            <KeyFact icon={BarChart3} label="Level" value={job.experienceLevel} />
            <KeyFact icon={MapPin} label="Location" value={job.location.city} />
            <KeyFact
              icon={CalendarDays}
              label="Posted"
              value={relativeDate(job.postedAt)}
            />
          </div>

          {salary && (
            <p className="mt-4 text-sm text-text-muted">
              Listed compensation:{" "}
              <span className="text-text">{salary}</span>
            </p>
          )}

          {/* Description */}
          {job.description.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl text-text">About the role</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-muted">
                {job.description.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}

          <Section title="What you'll do" items={job.responsibilities} />
          <Section title="What you'll bring" items={job.requirements} />
          <Section title="Nice to have" items={job.preferred} />

          <MatchBreakdown job={job} />

          {job.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-1.5">
              {job.tags.map((t) => (
                <Badge key={t} tone="neutral">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="font-display text-lg text-text">
              Ready to apply?
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              You&apos;ll be taken to {job.source.replace(/^(Greenhouse|Lever|Ashby) · /, "")}&apos;s
              application page. PM Dream Job doesn&apos;t collect your application.
            </p>
            <div className="mt-4">
              <ApplyButton job={job} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <ApplyButton job={job} size="md" label="Apply now" />
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-text-faint">Company</dt>
                <dd className="text-right text-text">{job.company.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-faint">Location</dt>
                <dd className="text-right text-text">{job.location.city}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-faint">Source</dt>
                <dd className="text-right text-text">{job.source}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-faint">Posted</dt>
                <dd className="text-right text-text">
                  {relativeDate(job.postedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl text-text">Related roles</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {related.map((r) => (
              <JobCard key={r.id} job={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
