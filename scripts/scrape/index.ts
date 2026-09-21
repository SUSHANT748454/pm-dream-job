import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type { RawJob } from "../ingest/core.ts";
import { datasetItems, runActor } from "./apify.ts";
import { dedupeAndCap, isKeeper, retainFromPrevious } from "./quality.ts";
import { WEB_SOURCES } from "./sources.ts";

/**
 * Web scrape: pulls PM roles from job boards via Apify and writes a snapshot.
 *
 * It deliberately does NOT write jobs.json. Fetching (costs money, every 3
 * days) is decoupled from merging (free, every 5 hours): the regular ingest
 * re-reads this snapshot on every run, so these jobs count as "seen" each time
 * and don't get expired between scrapes. They leave the board only once a
 * later scrape stops returning them.
 *
 * Skips cleanly (exit 0) without APIFY_TOKEN, like every other optional
 * integration here.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Full snapshot. Outside src/ on purpose, so it can never be bundled into the site. */
const SNAPSHOT_FILE = path.join(HERE, "../../data/web-jobs.json");
/** Small summary the dashboard's admin panel imports. */
const META_FILE = path.join(HERE, "../../src/data/web-jobs-meta.json");

/** A source that fails keeps its previous jobs — but not indefinitely. */
const CARRY_FORWARD_MAX_DAYS = 10;

export interface SourceReport {
  id: string;
  label: string;
  status: "ok" | "failed" | "kept-previous" | "disabled";
  fetched: number;
  kept: number;
  lastSuccessAt: string | null;
  error?: string;
}

export interface WebSnapshot {
  fetchedAt: string;
  sources: SourceReport[];
  jobs: RawJob[];
}

async function loadPrevious(): Promise<WebSnapshot | null> {
  try {
    return JSON.parse(await readFile(SNAPSHOT_FILE, "utf8")) as WebSnapshot;
  } catch {
    return null;
  }
}

function daysSince(iso: string | null | undefined): number {
  return iso ? (Date.now() - Date.parse(iso)) / 86_400_000 : Infinity;
}

async function main() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.log("Web scrape: APIFY_TOKEN not set — skipping.");
    return;
  }

  const startedAt = new Date().toISOString();
  console.log(`\nPM Dream Job · web scrape @ ${startedAt}`);
  const previous = await loadPrevious();
  const prevReport = new Map((previous?.sources ?? []).map((s) => [s.id, s]));

  const reports: SourceReport[] = [];
  const collected: RawJob[] = [];

  // Sequential on purpose: Apify's free plan caps total memory across
  // concurrent runs, and a 3-day job has no reason to race.
  for (const src of WEB_SOURCES) {
    const lastSuccessAt = prevReport.get(src.id)?.lastSuccessAt ?? null;
    if (!src.enabled) {
      reports.push({ id: src.id, label: src.label, status: "disabled", fetched: 0, kept: 0, lastSuccessAt });
      continue;
    }

    try {
      const run = await runActor(token, src.actor, src.input, {
        maxTotalChargeUsd: src.maxChargeUsd,
        timeoutSecs: 900,
        pollBudgetMs: 16 * 60_000,
      });
      const items = await datasetItems<unknown>(token, run.defaultDatasetId, src.fields, src.maxItems + 50);
      const mapped = items
        .map((item) => {
          try {
            return src.map(item as never);
          } catch {
            return null; // one malformed row must not sink the whole source
          }
        })
        .filter((j): j is RawJob => j !== null);
      const kept = mapped.filter(isKeeper);
      collected.push(...kept);
      reports.push({
        id: src.id,
        label: src.label,
        status: "ok",
        fetched: items.length,
        kept: kept.length,
        lastSuccessAt: new Date().toISOString(),
      });
      console.log(`  ${src.label}: ${items.length} fetched → ${kept.length} PM roles in India`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Keep this source's last good jobs so one bad run doesn't blank it from
      // the board — unless its last success is too old to trust.
      const carried =
        daysSince(lastSuccessAt) <= CARRY_FORWARD_MAX_DAYS
          ? (previous?.jobs ?? []).filter((j) => j.source === src.label)
          : [];
      collected.push(...carried);
      reports.push({
        id: src.id,
        label: src.label,
        status: carried.length ? "kept-previous" : "failed",
        fetched: 0,
        kept: carried.length,
        lastSuccessAt,
        error: message.slice(0, 300),
      });
      console.warn(`  ${src.label}: FAILED — ${message}${carried.length ? ` (kept ${carried.length} from last run)` : ""}`);
    }
  }

  const succeeded = new Set(reports.filter((r) => r.status === "ok").map((r) => r.label));
  const retained = retainFromPrevious(previous?.jobs ?? [], collected, succeeded);
  if (retained.length) console.log(`  + ${retained.length} still-recent roles kept from the previous scrape`);

  const jobs = dedupeAndCap(
    [...collected, ...retained],
    WEB_SOURCES.map((s) => s.label),
  );
  const snapshot: WebSnapshot = { fetchedAt: startedAt, sources: reports, jobs };

  await mkdir(path.dirname(SNAPSHOT_FILE), { recursive: true });
  await writeFile(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  await writeFile(
    META_FILE,
    JSON.stringify({ fetchedAt: startedAt, total: jobs.length, sources: reports }, null, 2) + "\n",
    "utf8",
  );

  console.log(`\nDone. ${collected.length} collected + ${retained.length} kept → ${jobs.length} after de-duplication.\n`);

  // Red check only when the scrape is genuinely broken — every enabled source
  // failed with nothing to fall back on. Partial failures are logged, not fatal.
  const enabled = reports.filter((r) => r.status !== "disabled");
  if (enabled.length > 0 && enabled.every((r) => r.status === "failed")) {
    console.error("Every enabled source failed.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
