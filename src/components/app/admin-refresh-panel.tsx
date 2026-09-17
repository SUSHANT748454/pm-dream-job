"use client";

import * as React from "react";
import { ArrowUpRight, Loader2, RefreshCw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

/**
 * Admin-only "refresh now" control for the dashboard header.
 *
 * Renders nothing for everyone else. It never learns *why* someone isn't an
 * admin — it just asks /api/admin/refresh, and a 401/403 keeps it hidden — so
 * the admin allowlist never ships to the browser.
 */

type WorkflowKey = "scrape" | "refresh";

interface RunInfo {
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}

interface SourceReport {
  id: string;
  label: string;
  status: "ok" | "failed" | "kept-previous" | "disabled";
  kept: number;
  error?: string;
}

interface Status {
  canDispatch: boolean;
  workflows: Record<WorkflowKey, { label: string; cooldownMinutes: number; lastRun: RunInfo | null }>;
  web: { fetchedAt: string | null; total: number; sources: SourceReport[] };
}

const ACTIVE = new Set(["queued", "in_progress", "waiting", "requested", "pending"]);

const DESCRIPTIONS: Record<WorkflowKey, string> = {
  scrape: "LinkedIn, Naukri & Indeed via Apify · ~$0.34 of credit per run",
  refresh: "Company career boards · free · also runs every 5 hours",
};

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Status for an admin, or null for anyone else (401/403) — the panel stays hidden. */
async function fetchStatus(): Promise<Status | null> {
  const res = await authedFetch();
  if (!res || !res.ok) return null;
  return (await res.json()) as Status;
}

async function authedFetch(init?: RequestInit): Promise<Response | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return fetch("/api/admin/refresh", {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

export function AdminRefreshPanel() {
  const { ready, user } = useAuth();
  const [status, setStatus] = React.useState<Status | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<WorkflowKey | null>(null);
  const [notice, setNotice] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Right after a dispatch, keep polling even though no run shows as active
  // yet — GitHub takes a few seconds to list a freshly queued run.
  const [justStarted, setJustStarted] = React.useState(false);

  const load = React.useCallback(() => {
    fetchStatus().then(setStatus);
  }, []);

  React.useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    fetchStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const anyActive = status
    ? Object.values(status.workflows).some((w) => w.lastRun && ACTIVE.has(w.lastRun.status))
    : false;

  React.useEffect(() => {
    if (!justStarted) return;
    const t = setTimeout(() => setJustStarted(false), 2 * 60_000);
    return () => clearTimeout(t);
  }, [justStarted]);

  React.useEffect(() => {
    if (!anyActive && !justStarted) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [anyActive, justStarted, load]);

  if (!status) return null;

  async function run(key: WorkflowKey) {
    setBusy(key);
    setNotice(null);
    const res = await authedFetch({ method: "POST", body: JSON.stringify({ workflow: key }) });
    const body = res ? ((await res.json().catch(() => ({}))) as { message?: string; error?: string }) : {};
    setBusy(null);
    if (res?.ok) {
      setNotice({ tone: "ok", text: `${body.message ?? "Started."} New jobs go live a few minutes after it finishes.` });
      setJustStarted(true);
    } else {
      setNotice({ tone: "error", text: body.error ?? "Couldn't start the refresh." });
    }
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
      >
        <RefreshCw className={cn("h-3.5 w-3.5 text-gold", anyActive && "animate-spin")} />
        {anyActive ? "Refreshing…" : "Sources"}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Job sources"
            className="absolute right-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-pop)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">Job sources</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-text-faint">Admin</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 text-text-faint hover:text-text">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-xs">
              <p className="text-text-muted">
                {status.web.fetchedAt ? (
                  <>
                    Last web scrape <span className="text-text">{ago(status.web.fetchedAt)}</span> ·{" "}
                    <span className="text-text">{status.web.total}</span> roles
                  </>
                ) : (
                  "The web hasn't been scraped yet."
                )}
              </p>
              {status.web.sources.filter((s) => s.status !== "disabled").length > 0 && (
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
                  {status.web.sources
                    .filter((s) => s.status !== "disabled")
                    .map((s) => (
                      <span
                        key={s.id}
                        title={s.error}
                        className={s.status === "ok" ? "text-text-faint" : "text-red-400"}
                      >
                        {s.label} {s.kept}
                        {s.status === "failed" && " · failed"}
                        {s.status === "kept-previous" && " · stale"}
                      </span>
                    ))}
                </p>
              )}
            </div>

            <ul className="mt-3 space-y-2">
              {(Object.keys(status.workflows) as WorkflowKey[]).map((key) => {
                const wf = status.workflows[key];
                const last = wf.lastRun;
                const active = Boolean(last && ACTIVE.has(last.status));
                return (
                  <li key={key} className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] text-text">{wf.label}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-text-faint">{DESCRIPTIONS[key]}</p>
                      </div>
                      <button
                        onClick={() => run(key)}
                        disabled={!status.canDispatch || active || busy !== null}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gold px-3 text-xs font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-50"
                      >
                        {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {active ? "Running" : "Run now"}
                      </button>
                    </div>
                    {last && (
                      <p className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                        <span
                          className={cn(
                            active
                              ? "text-gold-soft"
                              : last.conclusion === "success"
                                ? "text-emerald-400"
                                : last.conclusion
                                  ? "text-red-400"
                                  : "text-text-faint",
                          )}
                        >
                          {active
                            ? `Running · started ${ago(last.createdAt)}`
                            : `${last.conclusion === "success" ? "Succeeded" : (last.conclusion ?? last.status)} · ${ago(last.createdAt)}`}
                        </span>
                        <a
                          href={last.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-text-faint hover:text-text"
                        >
                          Log <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {!status.canDispatch && (
              <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
                Add <code className="text-text-muted">GITHUB_DISPATCH_TOKEN</code> to the Vercel environment to enable
                these buttons.
              </p>
            )}

            {notice && (
              <p
                role="status"
                className={cn(
                  "mt-3 rounded-md px-3 py-2 text-xs leading-relaxed",
                  notice.tone === "ok"
                    ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border border-red-500/30 bg-red-500/10 text-red-300",
                )}
              >
                {notice.text}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
