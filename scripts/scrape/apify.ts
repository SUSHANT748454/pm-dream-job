/**
 * Minimal Apify REST client for the web-scrape job — dependency-free, like the
 * rest of scripts/.
 *
 * Uses the async run API (start, then poll) rather than
 * run-sync-get-dataset-items: the sync endpoint returns 408 once a run passes
 * 300 seconds, and a full LinkedIn scrape can.
 */

const API = "https://api.apify.com/v2";
const TERMINAL = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);

export interface RunLimits {
  /** Hard ceiling on what this run may bill — enforced by Apify, not by us. */
  maxTotalChargeUsd: number;
  /** Server-side run timeout, in seconds. */
  timeoutSecs: number;
  /** How long we'll keep polling before aborting the run ourselves. */
  pollBudgetMs: number;
}

interface ApifyRun {
  id: string;
  status: string;
  statusMessage?: string;
  defaultDatasetId: string;
}

async function call<T>(token: string, pathAndQuery: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${pathAndQuery}`, {
    ...init,
    headers: {
      // Header, not ?token= — Apify's recommendation, keeps it out of any logs.
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Apify HTTP ${res.status} on ${pathAndQuery.split("?")[0]}: ${body.slice(0, 240)}`);
  }
  return JSON.parse(body) as T;
}

/** Start an Actor and wait for it to finish. Throws unless it SUCCEEDED. */
export async function runActor(
  token: string,
  actor: string,
  input: Record<string, unknown>,
  limits: RunLimits,
): Promise<ApifyRun> {
  const qs = new URLSearchParams({
    timeout: String(limits.timeoutSecs),
    maxTotalChargeUsd: String(limits.maxTotalChargeUsd),
    waitForFinish: "60",
  });
  // The API addresses Actors as "username~name".
  const actorId = actor.replace("/", "~");
  let { data: run } = await call<{ data: ApifyRun }>(token, `/actors/${actorId}/runs?${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const deadline = Date.now() + limits.pollBudgetMs;
  while (!TERMINAL.has(run.status)) {
    if (Date.now() > deadline) {
      // Abort rather than walk away — an orphaned run keeps billing.
      await call(token, `/actor-runs/${run.id}/abort`, { method: "POST" }).catch(() => {});
      throw new Error(`run ${run.id} still ${run.status} after ${Math.round(limits.pollBudgetMs / 1000)}s — aborted`);
    }
    ({ data: run } = await call<{ data: ApifyRun }>(token, `/actor-runs/${run.id}?waitForFinish=60`));
  }

  if (run.status !== "SUCCEEDED") {
    throw new Error(`run ${run.id} ended ${run.status}${run.statusMessage ? ` — ${run.statusMessage}` : ""}`);
  }
  return run;
}

/**
 * Read a run's dataset, fetching ONLY the named top-level fields. Projection
 * happens on Apify's side, so anything not listed (e.g. LinkedIn's recruiter
 * names and profile URLs) is never downloaded at all.
 */
export async function datasetItems<T>(
  token: string,
  datasetId: string,
  fields: readonly string[],
  limit: number,
): Promise<T[]> {
  const qs = new URLSearchParams({
    clean: "true",
    format: "json",
    limit: String(limit),
    fields: fields.join(","),
  });
  return call<T[]>(token, `/datasets/${datasetId}/items?${qs}`);
}
