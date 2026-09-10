"use client";

import Link from "next/link";
import { MapPin, Briefcase, Building2, ArrowUpRight } from "lucide-react";

import type { Job } from "@/types/job";
import { cn, relativeDate, formatSalary } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";

export function JobCard({ job, className }: { job: Job; className?: string }) {
  const salary = formatSalary(job.salary);

  return (
    <article
      className={cn(
        "group relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <Logo
          name={job.company.name}
          src={job.company.logo}
          domain={job.company.domain}
          size={46}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[17px] leading-tight text-text">
                <Link
                  href={`/jobs/${job.slug}`}
                  onClick={() =>
                    trackEvent({
                      name: "job_card_clicked",
                      props: {
                        jobId: job.id,
                        slug: job.slug,
                        company: job.company.name,
                      },
                    })
                  }
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {job.title}
                </Link>
              </h3>
              <p className="mt-0.5 truncate text-sm text-text-muted">
                {job.company.name}
              </p>
            </div>
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-text-faint transition-colors group-hover:text-gold" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-text-faint" />
              {job.location.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-text-faint" />
              {job.workMode}
            </span>
            {(job.experienceMin != null || job.experienceMax != null) && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-text-faint" />
                {job.experienceMin ?? 0}
                {job.experienceMax ? `–${job.experienceMax}` : "+"} yrs
              </span>
            )}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="gold">{job.experienceLevel}</Badge>
            {job.domain.slice(0, 2).map((d) => (
              <Badge key={d} tone="outline">
                {d}
              </Badge>
            ))}
            {salary && <Badge tone="neutral">{salary}</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-text-faint">
        <span>{job.employmentType}</span>
        <span>Posted {relativeDate(job.postedAt)}</span>
      </div>
    </article>
  );
}
