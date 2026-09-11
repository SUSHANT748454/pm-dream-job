"use client";

import * as React from "react";

/**
 * Self-practice interview history — localStorage only, no sync. Low-stakes
 * practice data; not worth the complexity of the Supabase sync layer the
 * profile/résumé/tracker use.
 */

export interface RatingSet {
  structure: number;
  tradeoffs: number;
  metrics: number;
  empathy: number;
  communication: number;
}

export interface PracticeRecord {
  id: string;
  questionId: string;
  category: string;
  q: string;
  durationSec: number;
  ratings: RatingSet;
  overall: number;
  completedAt: string;
}

const KEY = "pmdj.practice.v1";
const EVENT = "pmdj:practice-changed";
const MAX_RECORDS = 100;

function read(): PracticeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PracticeRecord[]) : [];
  } catch {
    return [];
  }
}

function write(records: PracticeRecord[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function usePracticeHistory(): {
  records: PracticeRecord[];
  hydrated: boolean;
  add: (r: Omit<PracticeRecord, "id" | "completedAt">) => void;
  clear: () => void;
} {
  const [records, setRecords] = React.useState<PracticeRecord[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate client hydration */
    const sync = () => setRecords(read());
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

  const add = React.useCallback((r: Omit<PracticeRecord, "id" | "completedAt">) => {
    const record: PracticeRecord = {
      ...r,
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      completedAt: new Date().toISOString(),
    };
    const next = [...read(), record];
    write(next);
    setRecords(next);
  }, []);

  const clear = React.useCallback(() => {
    write([]);
    setRecords([]);
  }, []);

  return { records, hydrated, add, clear };
}
