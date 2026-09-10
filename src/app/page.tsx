import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { getStats, getFeaturedJobs, getCompanies } from "@/services/jobService";
import { LOCATIONS, EXPERIENCE_LEVELS } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/job-card";
import { TrackView } from "@/components/analytics/track-view";

export default function HomePage() {
  const stats = getStats();
  const featured = getFeaturedJobs(6);
  const companies = getCompanies().slice(0, 12);
  const hasData = stats.activeJobs > 0;

  return (
    <>
      <TrackView event={{ name: "page_viewed", props: { path: "/" } }} />

      {/* Hero */}
      <section className="container-page pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center animate-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-1 text-xs text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Product Management roles across India
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.08] tracking-tight text-text text-balance sm:text-[56px]">
            Find your next{" "}
            <span className="italic text-gold-soft">Product</span> role,
            without the ten open tabs.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-text-muted sm:text-base">
            PM Dream Job gathers Product Management openings from company career
            pages and job boards into one place — search, filter by level and
            domain, and apply at the source.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/jobs">
                Browse jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/companies">Explore companies</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        {hasData && (
          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-3 divide-x divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)]">
            {[
              { label: "Open roles", value: stats.activeJobs },
              { label: "Companies", value: stats.companies },
              { label: "Added this week", value: stats.newThisWeek },
            ].map((s) => (
              <div key={s.label} className="px-4 py-6 text-center">
                <dd className="font-display text-3xl text-text">{s.value}</dd>
                <dt className="mt-1 text-xs uppercase tracking-[0.12em] text-text-faint">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Featured jobs */}
      {featured.length > 0 && (
        <section className="container-page pb-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl text-text">Fresh this week</h2>
              <p className="mt-1 text-sm text-text-muted">
                The newest roles from across the board.
              </p>
            </div>
            <Link
              href="/jobs"
              className="hidden shrink-0 items-center gap-1 text-sm text-text-muted hover:text-text sm:inline-flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* Browse by */}
      <section className="container-page pb-16">
        <div className="grid gap-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-7 sm:grid-cols-2">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-faint">
              By experience
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <Link key={level} href={`/jobs?experienceLevel=${encodeURIComponent(level)}`}>
                  <Badge tone="outline" className="hover:border-gold hover:text-gold-soft">
                    {level}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-faint">
              By city
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <Link key={loc} href={`/jobs?location=${encodeURIComponent(loc)}`}>
                  <Badge tone="outline" className="hover:border-gold hover:text-gold-soft">
                    {loc}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Companies strip */}
      {companies.length > 0 && (
        <section className="container-page pb-24">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl text-text">Companies hiring now</h2>
            <Link
              href="/companies"
              className="hidden shrink-0 items-center gap-1 text-sm text-text-muted hover:text-text sm:inline-flex"
            >
              All companies <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/companies/${c.id}`}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm text-text-muted transition-colors hover:border-[var(--border-strong)] hover:text-text"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
