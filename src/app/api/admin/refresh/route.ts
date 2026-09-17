import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import webMeta from "@/data/web-jobs-meta.json";

/**
 * Admin-only "refresh now" for the dashboard. Starts the job-refresh or the
 * web-scrape GitHub workflow on demand, and reports how the last runs went.
 *
 * Why this is locked down: /app is open to every visitor, and each web scrape
 * spends real Apify credit. So the allowlist is checked here on the server —
 * hiding the button in the UI is a convenience, not the protection. The GitHub
 * token that can start workflows never reaches the browser.
 *
 * Needs (Vercel env vars): ADMIN_EMAILS, GITHUB_DISPATCH_TOKEN, plus the
 * Supabase public URL/key already used for sign-in.
 */

export const runtime = "nodejs";

const REPO = process.env.GITHUB_REPOSITORY || "SUSHANT748454/pm-dream-job";

const WORKFLOWS = {
  scrape: {
    file: "scrape-web-jobs.yml",
    label: "Scrape the web",
    // Each run spends ~$0.34 of Apify credit — this is what stops a double
    // click (or an impatient second press) from paying twice.
    cooldownMinutes: 60,
  },
  refresh: {
    file: "refresh-jobs.yml",
    label: "Refresh company boards",
    cooldownMinutes: 5,
  },
} as const;

type WorkflowKey = keyof typeof WORKFLOWS;

const ACTIVE_STATUSES = new Set(["queued", "in_progress", "waiting", "requested", "pending"]);

export interface RunInfo {
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

type Gate = { ok: true } | { ok: false; res: NextResponse };

async function requireAdmin(req: NextRequest): Promise<Gate> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, res: NextResponse.json({ error: "Sign-in isn't configured." }, { status: 503 }) };
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false, res: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  }
  // Verify the session with Supabase itself — never trust an email the client claims.
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(auth.slice(7));
  const email = data.user?.email?.toLowerCase();
  if (error || !email) {
    return { ok: false, res: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  }

  if (!adminEmails().has(email)) {
    return { ok: false, res: NextResponse.json({ error: "Not an admin." }, { status: 403 }) };
  }
  return { ok: true };
}

function github(path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pm-dream-job-admin",
      ...(init.headers ?? {}),
    },
  });
}

async function latestRun(key: WorkflowKey): Promise<RunInfo | null> {
  const res = await github(`/actions/workflows/${WORKFLOWS[key].file}/runs?per_page=1`);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    workflow_runs?: { status: string; conclusion: string | null; created_at: string; html_url: string }[];
  };
  const run = body.workflow_runs?.[0];
  return run
    ? { status: run.status, conclusion: run.conclusion, createdAt: run.created_at, url: run.html_url }
    : null;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const canDispatch = Boolean(process.env.GITHUB_DISPATCH_TOKEN);
  const [scrape, refresh] = canDispatch
    ? await Promise.all([latestRun("scrape"), latestRun("refresh")])
    : [null, null];

  return NextResponse.json({
    canDispatch,
    workflows: {
      scrape: { label: WORKFLOWS.scrape.label, cooldownMinutes: WORKFLOWS.scrape.cooldownMinutes, lastRun: scrape },
      refresh: { label: WORKFLOWS.refresh.label, cooldownMinutes: WORKFLOWS.refresh.cooldownMinutes, lastRun: refresh },
    },
    web: webMeta,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  if (!process.env.GITHUB_DISPATCH_TOKEN) {
    return NextResponse.json(
      { error: "Add GITHUB_DISPATCH_TOKEN to the Vercel environment to enable manual refreshes." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { workflow?: unknown } | null;
  const key = body?.workflow;
  if (key !== "scrape" && key !== "refresh") {
    return NextResponse.json({ error: "Unknown workflow." }, { status: 400 });
  }
  const wf = WORKFLOWS[key];

  // Guard spend before starting anything.
  const last = await latestRun(key);
  if (last && ACTIVE_STATUSES.has(last.status)) {
    return NextResponse.json({ error: `${wf.label} is already running.` }, { status: 409 });
  }
  if (last) {
    const minutesAgo = (Date.now() - Date.parse(last.createdAt)) / 60_000;
    if (minutesAgo < wf.cooldownMinutes) {
      const wait = Math.ceil(wf.cooldownMinutes - minutesAgo);
      return NextResponse.json(
        { error: `${wf.label} last started ${Math.floor(minutesAgo)} min ago — try again in ${wait} min.` },
        { status: 429 },
      );
    }
  }

  const res = await github(`/actions/workflows/${wf.file}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main" }),
  });

  if (res.status === 204) {
    return NextResponse.json({ ok: true, message: `${wf.label} started.` }, { status: 202 });
  }

  // GitHub's dispatch endpoint has been seen to answer 500 while still queuing
  // the run. Don't tell the admin to retry blindly — the in-progress check
  // above will catch a run that did start, so ask them to look first.
  return NextResponse.json(
    {
      error:
        res.status >= 500
          ? "GitHub didn't confirm the start, but it may have queued anyway. Check the status in a minute before retrying."
          : `GitHub refused the request (HTTP ${res.status}). Check that GITHUB_DISPATCH_TOKEN has Actions: read & write on this repo.`,
    },
    { status: 502 },
  );
}
