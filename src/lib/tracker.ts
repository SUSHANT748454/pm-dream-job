"use client";

import { useCallback } from "react";

import type { Job } from "@/types/job";
import { supabase } from "@/lib/supabase/client";
import type { ApplicationRow } from "@/lib/supabase/types";
import { useSyncedStore, type RemoteAdapter } from "@/lib/synced-store";

/**
 * Application tracker. localStorage first; when the visitor signs in it syncs to
 * the Supabase `applications` table (one row per job) — see `useSyncedStore`.
 */

export type Stage =
  | "saved"
  | "applied"
  | "screen"
  | "interview"
  | "offer"
  | "rejected";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "saved", label: "Saved", hint: "Shortlisted, not applied yet" },
  { id: "applied", label: "Applied", hint: "Application submitted" },
  { id: "screen", label: "Recruiter screen", hint: "Initial call scheduled/done" },
  { id: "interview", label: "Interview", hint: "In the interview loop" },
  { id: "offer", label: "Offer", hint: "Offer received" },
  { id: "rejected", label: "Rejected / closed", hint: "Not moving forward" },
];

export const STAGE_LABEL: Record<Stage, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.label]),
) as Record<Stage, string>;

export interface TrackedApplication {
  jobId: string;
  slug: string;
  title: string;
  company: string;
  companyId: string;
  location: string;
  applyUrl: string;
  source: string;
  stage: Stage;
  addedAt: string;
  updatedAt: string;
  appliedAt?: string;
  notes?: string;
}

const KEY = "pmdj.tracker.v1";
const EVENT = "pmdj:tracker-changed";

type Store = Record<string, TrackedApplication>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function snapshotFromJob(job: Job, stage: Stage): TrackedApplication {
  const now = new Date().toISOString();
  return {
    jobId: job.id,
    slug: job.slug,
    title: job.title,
    company: job.company.name,
    companyId: job.company.id,
    location: job.location.city,
    applyUrl: job.applyUrl,
    source: job.source,
    stage,
    addedAt: now,
    updatedAt: now,
    appliedAt: stage === "saved" ? undefined : now,
  };
}

/* ---------- "Did you apply?" tab-return prompt ----------
 * The Apply button opens the source posting in a new tab and has no way to
 * know whether the visitor actually applied. So: remember the click, and when
 * the visitor comes back to this tab, ask once. */

const APPLY_CLICK_KEY = "pmdj.apply-click";
const APPLY_WINDOW_MS = 30 * 60 * 1000;

export interface ApplyClickInfo {
  jobId: string;
  slug: string;
  title: string;
  company: string;
  companyId: string;
  location: string;
  applyUrl: string;
  source: string;
  ts: number;
}

/** Call when the Apply link is clicked. */
export function recordApplyClick(job: Job): void {
  try {
    const info: ApplyClickInfo = {
      jobId: job.id,
      slug: job.slug,
      title: job.title,
      company: job.company.name,
      companyId: job.company.id,
      location: job.location.city,
      applyUrl: job.applyUrl,
      source: job.source,
      ts: Date.now(),
    };
    sessionStorage.setItem(APPLY_CLICK_KEY, JSON.stringify(info));
    sessionStorage.removeItem(`pmdj.apply-prompted.${job.id}`);
  } catch {
    /* ignore */
  }
}

/**
 * Call when the tab regains visibility. Returns the pending click once — a
 * second call for the same job (without a fresh recordApplyClick) returns
 * null, so the prompt never nags twice for one apply.
 */
export function readPendingApplyClick(): ApplyClickInfo | null {
  try {
    const raw = sessionStorage.getItem(APPLY_CLICK_KEY);
    if (!raw) return null;
    const info = JSON.parse(raw) as ApplyClickInfo;
    if (Date.now() - info.ts > APPLY_WINDOW_MS) {
      sessionStorage.removeItem(APPLY_CLICK_KEY);
      return null;
    }
    const promptedKey = `pmdj.apply-prompted.${info.jobId}`;
    if (sessionStorage.getItem(promptedKey)) return null;
    sessionStorage.setItem(promptedKey, "1");
    return info;
  } catch {
    return null;
  }
}

/* ---------- Supabase mapping ---------- */

function rowToApp(r: ApplicationRow): TrackedApplication {
  return {
    jobId: r.job_id,
    slug: r.slug ?? "",
    title: r.title ?? "",
    company: r.company ?? "",
    companyId: r.company_id ?? "",
    location: r.location ?? "",
    applyUrl: r.apply_url ?? "",
    source: r.source ?? "",
    stage: (r.stage as Stage) || "saved",
    addedAt: r.added_at ?? r.updated_at,
    updatedAt: r.updated_at,
    appliedAt: r.applied_at ?? undefined,
    notes: r.note ?? undefined,
  };
}

function appToRow(userId: string, a: TrackedApplication) {
  return {
    user_id: userId,
    job_id: a.jobId,
    slug: a.slug,
    title: a.title,
    company: a.company,
    company_id: a.companyId,
    location: a.location,
    apply_url: a.applyUrl,
    source: a.source,
    stage: a.stage,
    note: a.notes ?? null,
    added_at: a.addedAt,
    applied_at: a.appliedAt ?? null,
    updated_at: a.updatedAt,
  };
}

const remote: RemoteAdapter<Store> = {
  fetch: async (userId) => {
    const { data } = await supabase!
      .from("applications")
      .select("*")
      .eq("user_id", userId);
    if (!data) return null;
    const store: Store = {};
    for (const r of data as ApplicationRow[]) store[r.job_id] = rowToApp(r);
    return store;
  },
  push: async (userId, store) => {
    const rows = Object.values(store).map((a) => appToRow(userId, a));
    if (rows.length) await supabase!.from("applications").upsert(rows);
    const ids = Object.keys(store);
    let del = supabase!.from("applications").delete().eq("user_id", userId);
    if (ids.length) {
      const list = ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
      del = del.not("job_id", "in", `(${list})`);
    }
    await del;
  },
  remove: async (userId) => {
    await supabase!.from("applications").delete().eq("user_id", userId);
  },
};

function mergeStores(local: Store, incoming: Store): Store {
  const out: Store = { ...incoming };
  for (const [id, a] of Object.entries(local)) {
    if (!out[id] || a.updatedAt > out[id].updatedAt) out[id] = a;
  }
  return out;
}

/* Stable references for useSyncedStore. */
function clearTracker(): void {
  write({});
}
const trackerEmpty = (s: Store): boolean => Object.keys(s).length === 0;
const EMPTY_STORE: Store = {};

export function useTracker() {
  const store = useSyncedStore<Store>({
    empty: EMPTY_STORE,
    readLocal: read,
    writeLocal: write,
    clearLocal: clearTracker,
    event: EVENT,
    isEmpty: trackerEmpty,
    remote,
    merge: mergeStores,
  });
  const { value: map, save, hydrated, syncing } = store;

  const upsert = useCallback(
    (job: Job, stage: Stage) => {
      const cur = read();
      const prev = cur[job.id];
      const now = new Date().toISOString();
      cur[job.id] = prev
        ? {
            ...prev,
            stage,
            updatedAt: now,
            appliedAt: prev.appliedAt ?? (stage !== "saved" ? now : undefined),
          }
        : snapshotFromJob(job, stage);
      save({ ...cur });
    },
    [save],
  );

  const setStage = useCallback(
    (jobId: string, stage: Stage) => {
      const cur = read();
      if (!cur[jobId]) return;
      const now = new Date().toISOString();
      cur[jobId] = {
        ...cur[jobId],
        stage,
        updatedAt: now,
        appliedAt: cur[jobId].appliedAt ?? (stage !== "saved" ? now : undefined),
      };
      save({ ...cur });
    },
    [save],
  );

  const setNotes = useCallback(
    (jobId: string, notes: string) => {
      const cur = read();
      if (!cur[jobId]) return;
      cur[jobId] = { ...cur[jobId], notes, updatedAt: new Date().toISOString() };
      save({ ...cur });
    },
    [save],
  );

  const remove = useCallback(
    (jobId: string) => {
      const cur = read();
      delete cur[jobId];
      save({ ...cur });
    },
    [save],
  );

  /** From the "did you apply?" prompt — doesn't need a full Job, just the click info. */
  const markApplied = useCallback(
    (info: ApplyClickInfo) => {
      const cur = read();
      const prev = cur[info.jobId];
      const now = new Date().toISOString();
      cur[info.jobId] = prev
        ? {
            ...prev,
            stage: "applied",
            updatedAt: now,
            appliedAt: prev.appliedAt ?? now,
          }
        : {
            jobId: info.jobId,
            slug: info.slug,
            title: info.title,
            company: info.company,
            companyId: info.companyId,
            location: info.location,
            applyUrl: info.applyUrl,
            source: info.source,
            stage: "applied",
            addedAt: now,
            updatedAt: now,
            appliedAt: now,
          };
      save({ ...cur });
    },
    [save],
  );

  const list = Object.values(map).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  return {
    hydrated,
    syncing,
    map,
    list,
    markApplied,
    get: (jobId: string) => map[jobId],
    upsert,
    setStage,
    setNotes,
    remove,
  };
}

/** ms until the next 5-hour UTC refresh boundary (00:00, 05:00, 10:00, 15:00, 20:00). */
export function msToNextRefresh(from = Date.now()): number {
  const period = 5 * 60 * 60 * 1000;
  return period - (from % period);
}
