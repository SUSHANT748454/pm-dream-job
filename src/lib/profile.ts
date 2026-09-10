"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { ExperienceLevel } from "@/types/job";

/**
 * Lightweight, on-device job-seeker profile captured by the /welcome flow.
 * Stored in localStorage only — no account, no server (that's Phase 2). It's
 * used to personalise the board (default filters, greeting) and nothing leaves
 * the browser.
 */

export interface SeekerProfile {
  fullName: string;
  email: string;
  phone?: string;
  country: string;
  hearAbout?: string;
  resumeName?: string;
  resumeSize?: number;
  experienceYears?: ExperienceBand;
  currentDesignation?: string;
  updatedAt: string;
}

export type ExperienceBand =
  | "0-2 years"
  | "2-5 years"
  | "5-8 years"
  | "8-12 years"
  | "12+ years";

export const EXPERIENCE_BANDS: ExperienceBand[] = [
  "0-2 years",
  "2-5 years",
  "5-8 years",
  "8-12 years",
  "12+ years",
];

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Germany",
  "Canada",
  "Australia",
  "Other",
];

export const HEAR_ABOUT = [
  "LinkedIn",
  "A friend or colleague",
  "Search engine",
  "Newsletter",
  "Twitter / X",
  "Reddit",
  "Other",
];

const KEY = "pmdj.profile.v1";
const EVENT = "pmdj:profile-changed";

export function readProfile(): SeekerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SeekerProfile;
    return parsed && parsed.fullName ? parsed : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile: SeekerProfile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* private mode / quota — fail quietly */
  }
}

export function clearProfile(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/** Map an experience band to the closest PM ladder rung for default filtering. */
export function bandToLevel(band?: ExperienceBand): ExperienceLevel | null {
  switch (band) {
    case "0-2 years":
      return "APM";
    case "2-5 years":
      return "Product Manager";
    case "5-8 years":
      return "Senior Product Manager";
    case "8-12 years":
      return "Lead Product Manager";
    case "12+ years":
      return "Director";
    default:
      return null;
  }
}

export function firstName(profile: SeekerProfile | null): string | null {
  if (!profile?.fullName) return null;
  return profile.fullName.trim().split(/\s+/)[0] ?? null;
}

/* ---- external-store plumbing so the hook is SSR-safe and reactive ---- */

let cache: SeekerProfile | null = null;
let cacheRaw: string | null = null;

function getSnapshot(): SeekerProfile | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = readProfile();
  }
  return cache;
}

function getServerSnapshot(): SeekerProfile | null {
  return null;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Reactive hook: re-renders on profile change in this or another tab. */
export function useProfile(): {
  profile: SeekerProfile | null;
  hydrated: boolean;
  save: (p: SeekerProfile) => void;
  clear: () => void;
} {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const save = useCallback((p: SeekerProfile) => writeProfile(p), []);
  const clear = useCallback(() => clearProfile(), []);

  return { profile, hydrated, save, clear };
}
