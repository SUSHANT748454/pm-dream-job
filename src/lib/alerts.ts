"use client";

import * as React from "react";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Weekly job-alert subscription. Unlike profile/résumé/tracker, this has no
 * localStorage fallback — an alert is meaningless without a durable identity
 * and address to send it to, so it's the one feature in this app that
 * genuinely requires signing in.
 */

export interface AlertPrefs {
  email: string;
  locations: string[];
  experienceLevels: string[];
  workModes: string[];
  domains: string[];
  enabled: boolean;
  lastSentAt: string | null;
}

interface AlertRow {
  email: string;
  locations: string[] | null;
  experience_levels: string[] | null;
  work_modes: string[] | null;
  domains: string[] | null;
  enabled: boolean;
  last_sent_at: string | null;
}

function rowToPrefs(r: AlertRow): AlertPrefs {
  return {
    email: r.email,
    locations: r.locations ?? [],
    experienceLevels: r.experience_levels ?? [],
    workModes: r.work_modes ?? [],
    domains: r.domains ?? [],
    enabled: r.enabled,
    lastSentAt: r.last_sent_at,
  };
}

export async function fetchAlertPrefs(userId: string): Promise<AlertPrefs | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("job_alerts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? rowToPrefs(data as AlertRow) : null;
}

export async function saveAlertPrefs(
  userId: string,
  prefs: Omit<AlertPrefs, "lastSentAt">,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Not configured." };
  const { error } = await supabase.from("job_alerts").upsert({
    user_id: userId,
    email: prefs.email,
    locations: prefs.locations,
    experience_levels: prefs.experienceLevels,
    work_modes: prefs.workModes,
    domains: prefs.domains,
    enabled: prefs.enabled,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message ?? null };
}

export async function deleteAlertPrefs(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("job_alerts").delete().eq("user_id", userId);
}

export function useAlertPrefs(): {
  prefs: AlertPrefs | null;
  loading: boolean;
  save: (p: Omit<AlertPrefs, "lastSentAt">) => Promise<{ error: string | null }>;
  remove: () => Promise<void>;
} {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [prefs, setPrefs] = React.useState<AlertPrefs | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- clears on sign-out */
      setPrefs(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchAlertPrefs(userId).then((p) => {
      if (!active) return;
      setPrefs(p);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = React.useCallback(
    async (input: Omit<AlertPrefs, "lastSentAt">) => {
      if (!userId) return { error: "Sign in first." };
      const result = await saveAlertPrefs(userId, input);
      if (!result.error) setPrefs({ ...input, lastSentAt: prefs?.lastSentAt ?? null });
      return result;
    },
    [userId, prefs?.lastSentAt],
  );

  const remove = React.useCallback(async () => {
    if (!userId) return;
    await deleteAlertPrefs(userId);
    setPrefs(null);
  }, [userId]);

  return { prefs, loading, save, remove };
}
