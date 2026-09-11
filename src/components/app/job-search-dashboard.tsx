"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  MapPin,
  Search,
  X,
} from "lucide-react";

import type { Job, JobSort } from "@/types/job";
import {
  LOCATIONS,
  EXPERIENCE_LEVELS,
  WORK_MODES,
  DOMAINS,
} from "@/lib/filters";
import { cn, relativeDate, formatSalary } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useTracker, recordApplyClick, STAGES, type Stage } from "@/lib/tracker";
import { useResume } from "@/lib/resume";
import { useProfile } from "@/lib/profile";
import { resumeTerms, scoreJob, type MatchResult } from "@/lib/ats";
import { MatchBadge } from "@/components/match-badge";
import { MatchBreakdown } from "@/components/match-breakdown";
import { ResumePrompt } from "@/components/resume-prompt";
import { SortSelect } from "@/components/sort-select";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/app/sparkline";
import { RefreshCountdown } from "@/components/app/refresh-countdown";

type Stats = {
  total: number;
  new24h: number;
  new7d: number;
  companies: number;
  intake7d: number[];
};

const DATE_OPTIONS = [
  { id: "all", label: "Any time", days: 9999 },
  { id: "1", label: "Last 24 hours", days: 1 },
  { id: "3", label: "Last 3 days", days: 3 },
  { id: "7", label: "Last week", days: 7 },
];

function sameDay(iso: string | undefined, dayStr: string): boolean {
  return !!iso && iso.slice(0, 10) === dayStr;
}

export function JobSearchDashboard({
  jobs,
  stats,
}: {
  jobs: Job[];
  stats: Stats;
}) {
  const router = useRouter();
  const tracker = useTracker();
  const { resume } = useResume();
  const { profile } = useProfile();
  const [now] = React.useState(() => Date.now());
  const [sort, setSort] = React.useState<JobSort>("recent");
  const rel = React.useCallback((iso: string) => relativeDate(iso, now), [now]);

  const matches = React.useMemo(() => {
    if (!resume) return null;
    const terms = resumeTerms(resume.text);
    const m = new Map<string, MatchResult>();
    for (const j of jobs) m.set(j.id, scoreJob(terms, j, profile?.experienceYears));
    return m;
  }, [resume, jobs, profile?.experienceYears]);

  // Once a résumé loads, default to "Best match" — once, so it doesn't fight a
  // choice the visitor makes afterwards.
  const autoMatchSortRef = React.useRef(false);
  React.useEffect(() => {
    if (autoMatchSortRef.current || !matches) return;
    autoMatchSortRef.current = true;
    setSort("match");
  }, [matches]);

  const [q, setQ] = React.useState("");
  const [city, setCity] = React.useState("");
  const [mode, setMode] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [dateId, setDateId] = React.useState("all");
  const [mobileDetail, setMobileDetail] = React.useState(false);
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    const read = () => {
      try {
        setSelectedSlug(new URLSearchParams(window.location.search).get("job"));
      } catch {
        setSelectedSlug(null);
      }
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const companies = React.useMemo(
    () =>
      Array.from(new Set(jobs.map((j) => j.company.name))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [jobs],
  );

  const dateDays = DATE_OPTIONS.find((d) => d.id === dateId)?.days ?? 9999;

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const terms = needle.split(/\s+/).filter(Boolean);
    const base = jobs.filter((j) => {
      if (city && j.location.city !== city && !(city === "Remote" && j.workMode === "Remote"))
        return false;
      if (mode && j.workMode !== mode) return false;
      if (level && j.experienceLevel !== level) return false;
      if (company && j.company.name !== company) return false;
      if (domain && !j.domain.includes(domain as Job["domain"][number])) return false;
      if (dateDays < 9999) {
        const age = Math.floor(
          (now - new Date(j.postedAt + "T00:00:00Z").getTime()) / 86_400_000,
        );
        if (age > dateDays) return false;
      }
      if (terms.length) {
        const hay = [
          j.title,
          j.company.name,
          j.location.city,
          j.experienceLevel,
          ...j.skills,
          ...j.tags,
          ...j.domain,
        ]
          .join(" ")
          .toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const sorted = [...base];
    if (sort === "match" && matches)
      sorted.sort(
        (a, b) =>
          (matches.get(b.id)?.score ?? 0) - (matches.get(a.id)?.score ?? 0) ||
          b.postedAt.localeCompare(a.postedAt),
      );
    else if (sort === "oldest") sorted.sort((a, b) => a.postedAt.localeCompare(b.postedAt));
    else if (sort === "company")
      sorted.sort(
        (a, b) =>
          a.company.name.localeCompare(b.company.name) ||
          b.postedAt.localeCompare(a.postedAt),
      );
    else sorted.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    return sorted;
  }, [jobs, q, city, mode, level, company, domain, dateDays, now, matches, sort]);

  const selected =
    filtered.find((j) => j.slug === selectedSlug) ?? filtered[0] ?? null;

  const select = (slug: string) => {
    setSelectedSlug(slug);
    router.replace(`/app?job=${encodeURIComponent(slug)}`, { scroll: false });
    setMobileDetail(true);
  };

  const activeFilterCount =
    [city, mode, level, company, domain].filter(Boolean).length +
    (dateId !== "all" ? 1 : 0);

  const clearFilters = () => {
    setCity("");
    setMode("");
    setLevel("");
    setCompany("");
    setDomain("");
    setDateId("all");
  };

  const todayStr = new Date(now).toISOString().slice(0, 10);
  const appliedToday = tracker.list.filter((t) =>
    sameDay(t.appliedAt, todayStr),
  ).length;

  return (
    <div className="flex h-[100dvh] flex-col md:h-auto md:min-h-[100dvh]">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl tracking-tight text-text">
              Job Search
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Every PM role in India, refreshed through the day — browse, filter,
              and track what you apply to.
            </p>
          </div>
          <RefreshCountdown />
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="New in last 24h" value={stats.new24h} series={stats.intake7d} tone="gold" />
          <StatCard label="New in last 7 days" value={stats.new7d} series={stats.intake7d} tone="accent" />
          <StatCard label="Companies hiring" value={stats.companies} series={stats.intake7d} tone="positive" />
          <StatCard
            label="Applied today"
            value={tracker.hydrated ? appliedToday : 0}
            series={stats.intake7d.map(() => 0)}
            tone="neutral"
          />
        </div>

        {/* Filter bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-text-faint" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (e.target.value)
                  trackEvent({
                    name: "job_searched",
                    props: { query: e.target.value, results: filtered.length },
                  });
              }}
              placeholder="Search title, company, skill…"
              className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear search">
                <X className="h-3.5 w-3.5 text-text-faint hover:text-text" />
              </button>
            )}
          </div>
          <FilterSelect label="City" value={city} onChange={setCity} options={[...LOCATIONS]} />
          <FilterSelect label="Work mode" value={mode} onChange={setMode} options={[...WORK_MODES]} />
          <FilterSelect label="Level" value={level} onChange={setLevel} options={[...EXPERIENCE_LEVELS]} />
          <FilterSelect label="Domain" value={domain} onChange={setDomain} options={[...DOMAINS]} />
          <FilterSelect label="Company" value={company} onChange={setCompany} options={companies} />
          <FilterSelect
            label="Date posted"
            value={dateId === "all" ? "" : DATE_OPTIONS.find((d) => d.id === dateId)!.label}
            onChange={(lbl) =>
              setDateId(DATE_OPTIONS.find((d) => d.label === lbl)?.id ?? "all")
            }
            options={DATE_OPTIONS.filter((d) => d.id !== "all").map((d) => d.label)}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="rounded-lg px-2.5 py-2 text-[13px] text-text-muted hover:text-text"
            >
              Clear ({activeFilterCount})
            </button>
          )}

          <div className="ml-auto">
            <SortSelect
              value={sort === "match" && !matches ? "recent" : sort}
              onChange={setSort}
              withMatch={Boolean(matches)}
            />
          </div>
        </div>

        {!resume && (
          <div className="mt-4">
            <ResumePrompt />
          </div>
        )}
      </div>

      {/* Master / detail */}
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,360px)_1fr]">
        {/* List */}
        <div
          className={cn(
            "min-h-0 overflow-y-auto border-r border-[var(--border)] scroll-slim",
            mobileDetail && "hidden md:block",
          )}
        >
          <p className="sticky top-0 z-10 border-b border-[var(--border)] bg-bg px-4 py-2.5 text-xs text-text-faint">
            {filtered.length} {filtered.length === 1 ? "role" : "roles"}
          </p>
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-text-muted">
              No roles match these filters.
            </p>
          ) : (
            <ul>
              {filtered.map((job) => {
                const t = tracker.get(job.id);
                return (
                  <li key={job.id}>
                    <button
                      onClick={() => select(job.slug)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-card)]",
                        selected?.id === job.id && "bg-[var(--bg-card)]",
                      )}
                    >
                      <Logo name={job.company.name} src={job.company.logo} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-[13.5px] font-medium",
                              selected?.id === job.id ? "text-gold-soft" : "text-text",
                            )}
                          >
                            {job.title}
                          </span>
                          {matches?.get(job.id) && (
                            <MatchBadge
                              compact
                              score={matches.get(job.id)!.score}
                              band={matches.get(job.id)!.band}
                            />
                          )}
                          {t && (
                            <span className="shrink-0 rounded-full bg-[var(--gold-dim)] px-1.5 text-[10px] text-gold-soft">
                              {STAGES.find((s) => s.id === t.stage)?.label}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-text-muted">
                          {job.company.name} · {job.location.city} · {job.workMode}
                        </span>
                        <span className="mt-1 block text-[11px] text-text-faint">
                          {job.experienceMin != null
                            ? `${job.experienceMin}${job.experienceMax ? `–${job.experienceMax}` : "+"} yrs · `
                            : ""}
                          {job.employmentType} · {rel(job.postedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div
          className={cn(
            "min-h-0 overflow-y-auto scroll-slim",
            !mobileDetail && "hidden md:block",
          )}
        >
          {selected ? (
            <DetailPane
              job={selected}
              rel={rel}
              tracked={tracker.get(selected.id)}
              onSetStage={(stage) => tracker.upsert(selected, stage)}
              onRemove={() => tracker.remove(selected.id)}
              onBack={() => setMobileDetail(false)}
            />
          ) : (
            <div className="grid h-full place-items-center px-6 py-20 text-center text-sm text-text-muted">
              Select a role to see the details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  series,
  tone,
}: {
  label: string;
  value: number;
  series: number[];
  tone: "gold" | "accent" | "positive" | "neutral";
}) {
  const color =
    tone === "gold"
      ? "var(--gold)"
      : tone === "accent"
        ? "var(--accent)"
        : tone === "positive"
          ? "var(--positive)"
          : "var(--text-faint)";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-2xl text-text">{value}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-text-faint">
            {label}
          </p>
        </div>
        <Sparkline data={series} className="h-8 w-20" stroke={color} />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none rounded-lg border bg-[var(--bg-card)] py-2 pl-3 pr-8 text-[13px] focus:outline-none",
          value
            ? "border-[rgba(216,179,106,0.45)] text-text"
            : "border-[var(--border-strong)] text-text-muted",
        )}
      >
        <option value="">{label}: All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
    </label>
  );
}

function DetailPane({
  job,
  rel,
  tracked,
  onSetStage,
  onRemove,
  onBack,
}: {
  job: Job;
  rel: (iso: string) => string;
  tracked?: { stage: Stage };
  onSetStage: (s: Stage) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  const salary = formatSalary(job.salary);
  return (
    <div className="px-4 py-5 sm:px-8">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted md:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>

      <div className="flex items-start gap-4">
        <Logo name={job.company.name} src={job.company.logo} size={52} />
        <div className="min-w-0">
          <p className="text-sm text-text-muted">
            {job.company.name}
            {job.company.domain ? (
              <span className="text-text-faint"> · {job.company.domain}</span>
            ) : null}
            <span className="text-text-faint"> · via {job.source.replace(/^(Greenhouse|Lever|Ashby) · .+$/, (m) => m.split(" · ")[0])}</span>
          </p>
          <h2 className="mt-1 font-display text-[22px] leading-tight tracking-tight text-text">
            {job.title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            <MapPin className="h-3.5 w-3.5 text-text-faint" />
            {job.location.city}, India · {rel(job.postedAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge tone="outline">{job.workMode}</Badge>
        <Badge tone="outline">{job.employmentType}</Badge>
        {(job.experienceMin != null || job.experienceMax != null) && (
          <Badge tone="outline">
            {job.experienceMin ?? 0}
            {job.experienceMax ? `–${job.experienceMax}` : "+"} yrs
          </Badge>
        )}
        <Badge tone="gold">{job.experienceLevel}</Badge>
        {job.domain.map((d) => (
          <Badge key={d} tone="outline">
            {d}
          </Badge>
        ))}
        {salary && <Badge tone="neutral">{salary}</Badge>}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => {
            trackEvent({
              name: "apply_clicked",
              props: {
                jobId: job.id,
                slug: job.slug,
                company: job.company.name,
                source: job.source,
              },
            });
            recordApplyClick(job);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-2 text-sm text-text hover:bg-[var(--bg-elevated)]"
        >
          View posting <ArrowUpRight className="h-4 w-4" />
        </a>
        <ApplyControl tracked={tracked} onSetStage={onSetStage} onRemove={onRemove} />
        <Link
          href={`/jobs/${job.slug}`}
          className="text-[13px] text-text-faint hover:text-text"
        >
          Open full page
        </Link>
      </div>

      {job.description.length > 0 && (
        <section className="mt-7">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
            Summary
          </h3>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-text-muted">
            {job.description.split("\n\n").slice(0, 3).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      <DetailList title="What you'll do" items={job.responsibilities} />
      <DetailList title="What you'll bring" items={job.requirements} />
      <DetailList title="Nice to have" items={job.preferred} />

      <MatchBreakdown job={job} />
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-muted">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
            {it}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ApplyControl({
  tracked,
  onSetStage,
  onRemove,
}: {
  tracked?: { stage: Stage };
  onSetStage: (s: Stage) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  if (!tracked) {
    return (
      <>
        <button
          onClick={() => onSetStage("saved")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-2 text-sm text-text hover:bg-[var(--bg-elevated)]"
        >
          Save
        </button>
        <button
          onClick={() => onSetStage("applied")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-[#1a1406] hover:bg-gold-soft"
        >
          Mark as Applied
        </button>
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(216,179,106,0.4)] bg-[var(--gold-dim)] px-4 py-2 text-sm text-gold-soft"
      >
        <Check className="h-4 w-4" />
        {STAGES.find((s) => s.id === tracked.stage)?.label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-40 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-pop)]">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSetStage(s.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px]",
                  s.id === tracked.stage
                    ? "bg-[var(--bg-card)] text-text"
                    : "text-text-muted hover:bg-[var(--bg-card)] hover:text-text",
                )}
              >
                {s.label}
                {s.id === tracked.stage && <Check className="h-3.5 w-3.5 text-gold" />}
              </button>
            ))}
            <button
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
              className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger hover:bg-[var(--bg-card)]"
            >
              Remove from tracker
            </button>
          </div>
        </>
      )}
    </div>
  );
}
