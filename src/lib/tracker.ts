"use client";

import { useCallback, useEffect, useState } from "react";

import type { Job } from "@/types/job";

/**
 * On-device application tracker. Like the profile, this lives only in
 * localStorage — no account, no server. It powers the Application Tracker board
 * and the "Applied" state on job cards.
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

export function useTracker() {
  const [store, setStore] = useState<Store>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client hydration from localStorage */
    const sync = () => setStore(read());
    sync();
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const upsert = useCallback((job: Job, stage: Stage) => {
    const store = read();
    const prev = store[job.id];
    const now = new Date().toISOString();
    store[job.id] = prev
      ? {
          ...prev,
          stage,
          updatedAt: now,
          appliedAt:
            prev.appliedAt ?? (stage !== "saved" ? now : undefined),
        }
      : snapshotFromJob(job, stage);
    write(store);
    setStore({ ...store });
  }, []);

  const setStage = useCallback((jobId: string, stage: Stage) => {
    const store = read();
    if (!store[jobId]) return;
    const now = new Date().toISOString();
    store[jobId] = {
      ...store[jobId],
      stage,
      updatedAt: now,
      appliedAt: store[jobId].appliedAt ?? (stage !== "saved" ? now : undefined),
    };
    write(store);
    setStore({ ...store });
  }, []);

  const setNotes = useCallback((jobId: string, notes: string) => {
    const store = read();
    if (!store[jobId]) return;
    store[jobId] = { ...store[jobId], notes, updatedAt: new Date().toISOString() };
    write(store);
    setStore({ ...store });
  }, []);

  const remove = useCallback((jobId: string) => {
    const store = read();
    delete store[jobId];
    write(store);
    setStore({ ...store });
  }, []);

  const list = Object.values(store).sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  );

  return {
    hydrated,
    map: store,
    list,
    get: (jobId: string) => store[jobId],
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
