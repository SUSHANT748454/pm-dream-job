"use client";

import type { ExperienceLevel } from "@/types/job";
import { supabase } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { useSyncedStore, type RemoteAdapter } from "@/lib/synced-store";

/**
 * Job-seeker profile. Captured by the /welcome flow and stored in localStorage.
 * When the visitor signs in, it also syncs to the Supabase `profiles` table so
 * it follows them across devices — see `useSyncedStore`.
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

/* Stable references for useSyncedStore. */
function putProfile(p: SeekerProfile | null): void {
  if (p) writeProfile(p);
  else clearProfile();
}
const profileEmpty = (p: SeekerProfile | null): boolean => !p;

/* ---------- Supabase mapping ---------- */

function rowToProfile(r: ProfileRow): SeekerProfile {
  return {
    fullName: r.full_name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? undefined,
    country: r.country ?? "India",
    hearAbout: r.hear_about ?? undefined,
    resumeName: r.resume_name ?? undefined,
    experienceYears: (r.experience_years as ExperienceBand) || undefined,
    currentDesignation: r.current_designation ?? undefined,
    updatedAt: r.updated_at,
  };
}

const remote: RemoteAdapter<SeekerProfile | null> = {
  fetch: async (userId) => {
    const { data } = await supabase!
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data ? rowToProfile(data) : null;
  },
  push: async (userId, value) => {
    if (!value) return;
    await supabase!.from("profiles").upsert({
      user_id: userId,
      full_name: value.fullName,
      email: value.email,
      phone: value.phone ?? null,
      country: value.country,
      hear_about: value.hearAbout ?? null,
      experience_years: value.experienceYears ?? null,
      current_designation: value.currentDesignation ?? null,
      resume_name: value.resumeName ?? null,
      updated_at: new Date().toISOString(),
    });
  },
  remove: async (userId) => {
    await supabase!.from("profiles").delete().eq("user_id", userId);
  },
};

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

export function useProfile(): {
  profile: SeekerProfile | null;
  hydrated: boolean;
  syncing: boolean;
  save: (p: SeekerProfile) => void;
  clear: () => void;
} {
  const store = useSyncedStore<SeekerProfile | null>({
    empty: null,
    readLocal: readProfile,
    writeLocal: putProfile,
    clearLocal: clearProfile,
    event: EVENT,
    isEmpty: profileEmpty,
    remote,
  });

  return {
    profile: store.value,
    hydrated: store.hydrated,
    syncing: store.syncing,
    save: (p: SeekerProfile) => store.save(p),
    clear: store.clear,
  };
}
