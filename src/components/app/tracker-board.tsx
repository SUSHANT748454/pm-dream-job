"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Trash2 } from "lucide-react";

import { monogram } from "@/lib/utils";
import {
  useTracker,
  STAGES,
  type Stage,
  type TrackedApplication,
} from "@/lib/tracker";

export function TrackerBoard() {
  const { list, hydrated, setStage, remove } = useTracker();

  const byStage = React.useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.id, [] as TrackedApplication[]])) as Record<
      Stage,
      TrackedApplication[]
    >;
    for (const app of list) map[app.stage]?.push(app);
    return map;
  }, [list]);

  const funnel = {
    total: list.length,
    applied: list.filter((a) => a.stage !== "saved").length,
    interviewing: list.filter((a) => ["interview", "offer"].includes(a.stage)).length,
    offers: byStage.offer.length,
  };

  return (
    <div className="px-4 py-5 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-text">
            Application Tracker
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Move roles across stages as you go. Everything here is saved on this
            device.
          </p>
        </div>
        {hydrated && list.length > 0 && (
          <div className="flex gap-4 text-sm">
            <Stat n={funnel.total} label="tracked" />
            <Stat n={funnel.applied} label="applied" />
            <Stat n={funnel.interviewing} label="interviewing" />
            <Stat n={funnel.offers} label="offers" />
          </div>
        )}
      </header>

      {!hydrated ? null : list.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] px-6 py-16 text-center">
          <p className="font-display text-lg text-text">Nothing tracked yet</p>
          <p className="mt-1.5 text-sm text-text-muted">
            In Job Search, hit <span className="text-text">Mark as Applied</span>{" "}
            (or add to Saved) and roles show up here.
          </p>
          <Link
            href="/app"
            className="mt-5 inline-flex rounded-lg bg-gold px-4 py-2 text-sm font-medium text-[#1a1406]"
          >
            Go to Job Search
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4 scroll-slim">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className="flex max-h-[calc(100dvh-13rem)] w-[280px] shrink-0 flex-col self-start rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
                <span className="text-[13px] font-medium text-text">
                  {stage.label}
                </span>
                <span className="rounded-full bg-[var(--bg-card)] px-1.5 text-[11px] text-text-faint">
                  {byStage[stage.id].length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2.5 scroll-slim">
                {byStage[stage.id].length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-text-faint">
                    {stage.hint}
                  </p>
                )}
                {byStage[stage.id].map((app) => (
                  <Card
                    key={app.jobId}
                    app={app}
                    onStage={(s) => setStage(app.jobId, s)}
                    onRemove={() => remove(app.jobId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span className="text-text-muted">
      <span className="font-display text-lg text-text">{n}</span> {label}
    </span>
  );
}

function Card({
  app,
  onStage,
  onRemove,
}: {
  app: TrackedApplication;
  onStage: (s: Stage) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
      <div className="flex items-start gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] font-display text-[11px] text-gold-soft">
          {monogram(app.company)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/jobs/${app.slug}`}
            className="block truncate text-[13px] font-medium text-text hover:text-gold-soft"
          >
            {app.title}
          </Link>
          <p className="truncate text-[11.5px] text-text-muted">
            {app.company} · {app.location}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 text-text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
          aria-label="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <select
          value={app.stage}
          onChange={(e) => onStage(e.target.value as Stage)}
          className="flex-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2 py-1 text-[12px] text-text-muted focus:outline-none"
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <a
          href={app.applyUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="shrink-0 text-text-faint hover:text-text"
          aria-label="Open posting"
        >
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
