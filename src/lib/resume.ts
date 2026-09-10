"use client";

import { supabase } from "@/lib/supabase/client";
import type { ResumeRow } from "@/lib/supabase/types";
import { useSyncedStore, type RemoteAdapter } from "@/lib/synced-store";

/**
 * The résumé text, used for on-device ATS matching. Stored in localStorage and,
 * once the visitor signs in, synced to the Supabase `resumes` table. The
 * résumé *file* is never uploaded — only the extracted text.
 */

export type ResumeSource = "pdf" | "docx" | "txt" | "paste";

export interface StoredResume {
  text: string;
  fileName?: string;
  source: ResumeSource;
  chars: number;
  updatedAt: string;
}

const KEY = "pmdj.resume.v1";
const EVENT = "pmdj:resume-changed";
const MAX_CHARS = 60_000;

export function readResume(): StoredResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredResume;
    return parsed && parsed.text ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeResume(input: {
  text: string;
  fileName?: string;
  source: ResumeSource;
}): StoredResume {
  const text = input.text.replace(/\s+\n/g, "\n").trim().slice(0, MAX_CHARS);
  return {
    text,
    fileName: input.fileName,
    source: input.source,
    chars: text.length,
    updatedAt: new Date().toISOString(),
  };
}

function putResume(resume: StoredResume): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(resume));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota / private mode */
  }
}

/** Normalise + persist locally. Returns the stored record. */
export function writeResume(input: {
  text: string;
  fileName?: string;
  source: ResumeSource;
}): StoredResume {
  const resume = normalizeResume(input);
  putResume(resume);
  return resume;
}

export function clearResume(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/* Stable references for useSyncedStore. */
function putResumeOrClear(r: StoredResume | null): void {
  if (r) putResume(r);
  else clearResume();
}
const resumeEmpty = (r: StoredResume | null): boolean => !r;

/* ---------- Supabase mapping ---------- */

const remote: RemoteAdapter<StoredResume | null> = {
  fetch: async (userId) => {
    const { data } = await supabase!
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    const r = data as ResumeRow;
    return {
      text: r.text,
      fileName: r.file_name ?? undefined,
      source: (r.source as ResumeSource) || "paste",
      chars: r.chars ?? r.text.length,
      updatedAt: r.updated_at,
    };
  },
  push: async (userId, value) => {
    if (!value) return;
    await supabase!.from("resumes").upsert({
      user_id: userId,
      text: value.text,
      file_name: value.fileName ?? null,
      source: value.source,
      chars: value.chars,
      updated_at: new Date().toISOString(),
    });
  },
  remove: async (userId) => {
    await supabase!.from("resumes").delete().eq("user_id", userId);
  },
};

export function useResume(): {
  resume: StoredResume | null;
  hydrated: boolean;
  syncing: boolean;
  save: (input: { text: string; fileName?: string; source: ResumeSource }) => StoredResume;
  clear: () => void;
} {
  const store = useSyncedStore<StoredResume | null>({
    empty: null,
    readLocal: readResume,
    writeLocal: putResumeOrClear,
    clearLocal: clearResume,
    event: EVENT,
    isEmpty: resumeEmpty,
    remote,
  });

  return {
    resume: store.value,
    hydrated: store.hydrated,
    syncing: store.syncing,
    save: (input) => {
      const resume = normalizeResume(input);
      store.save(resume);
      return resume;
    },
    clear: store.clear,
  };
}
