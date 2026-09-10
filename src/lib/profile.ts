"use client";

import { useCallback, useEffect, useState } from "react";

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

/**
 * Reactive profile hook. It intentionally starts as `null` / not-hydrated and
 * fills in from localStorage in an effect: effects don't run during SSR or the
 * hydration render, so the server and first client render always agree — no
 * hydration mismatch, even inside a Suspense boundary.
 */
export function useProfile(): {
  profile: SeekerProfile | null;
  hydrated: boolean;
  save: (p: SeekerProfile) => void;
  clear: () => void;
} {
  const [profile, setProfile] = useState<SeekerProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       Deliberate: hydrate client-only state from localStorage after mount so
       the SSR and first client render agree. The extra render is intentional. */
    const sync = () => setProfile(readProfile());
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

  const save = useCallback((p: SeekerProfile) => {
    writeProfile(p);
    setProfile(p);
  }, []);

  const clear = useCallback(() => {
    clearProfile();
    setProfile(null);
  }, []);

  return { profile, hydrated, save, clear };
}
