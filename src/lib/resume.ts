"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The résumé, kept ONLY in this browser's localStorage — never uploaded. We
 * store the extracted plain text (used for on-device ATS matching) plus a bit
 * of metadata. Separate key from the profile because it's larger and has its
 * own lifecycle (a user can clear just this).
 */

export type ResumeSource = "pdf" | "docx" | "txt" | "paste";

export interface StoredResume {
  text: string;
  fileName?: string;
  source: ResumeSource;
  /** character count, for display */
  chars: number;
  updatedAt: string;
}

const KEY = "pmdj.resume.v1";
const EVENT = "pmdj:resume-changed";
/** localStorage is ~5 MB; keep well clear of it. Résumés are a few KB of text. */
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

export function writeResume(input: {
  text: string;
  fileName?: string;
  source: ResumeSource;
}): StoredResume {
  const text = input.text.replace(/\s+\n/g, "\n").trim().slice(0, MAX_CHARS);
  const resume: StoredResume = {
    text,
    fileName: input.fileName,
    source: input.source,
    chars: text.length,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(resume));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota / private mode — fail quietly */
  }
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

/**
 * Reactive résumé hook — same effect-based hydration pattern as `useProfile`, so
 * SSR and the first client render always agree (starts null / not hydrated).
 */
export function useResume(): {
  resume: StoredResume | null;
  hydrated: boolean;
  save: (input: { text: string; fileName?: string; source: ResumeSource }) => StoredResume;
  clear: () => void;
} {
  const [resume, setResume] = useState<StoredResume | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       Deliberate: hydrate client-only state from localStorage after mount. */
    const sync = () => setResume(readResume());
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

  const save = useCallback(
    (input: { text: string; fileName?: string; source: ResumeSource }) => {
      const next = writeResume(input);
      setResume(next);
      return next;
    },
    [],
  );

  const clear = useCallback(() => {
    clearResume();
    setResume(null);
  }, []);

  return { resume, hydrated, save, clear };
}
