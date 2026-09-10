import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TrackView } from "@/components/analytics/track-view";
import { getStats } from "@/services/jobService";

export const metadata: Metadata = {
  title: "About",
  description:
    "How PM Dream Job works: where the Product Management jobs come from, how often they refresh, and what the board does and doesn't do.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const stats = getStats();

  return (
    <div className="container-page py-14">
      <TrackView event={{ name: "page_viewed", props: { path: "/about" } }} />

      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight text-text">
          One place for Product Management jobs in India.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-text-muted">
          Product roles are scattered across company career pages and a dozen job
          boards. PM Dream Job pulls the Product Management openings into a single
          list you can actually search and filter — from APM to Director, by
          city, work mode and domain.
        </p>

        <div className="mt-10 space-y-10">
          <section id="data" className="scroll-mt-24">
            <h2 className="font-display text-xl text-text">Where the jobs come from</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Listings are gathered from public, no-login sources: The Muse&apos;s
              public jobs API and the public job boards that companies publish
              through Greenhouse, Lever and Ashby. Every listing links straight to
              the original employer or job board — you apply there, not here.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-text">How fresh it is</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              An automated job runs every five hours: it re-reads every source,
              adds new roles, and retires ones that have closed. Roles that
              haven&apos;t been seen for a while are marked expired and drop off
              the board.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-text">What it doesn&apos;t do</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              No account, no résumé upload, no application tracking — yet. Saved
              jobs, alerts and a Kanban-style application tracker are on the
              roadmap. For now the goal is narrow: help you find a relevant role
              and get to the application as fast as possible.
            </p>
          </section>
        </div>

        {stats.activeJobs > 0 && (
          <p className="mt-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-text-muted">
            Right now: <span className="text-text">{stats.activeJobs}</span> open
            roles across <span className="text-text">{stats.companies}</span>{" "}
            companies.
          </p>
        )}

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/jobs">Browse jobs</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
