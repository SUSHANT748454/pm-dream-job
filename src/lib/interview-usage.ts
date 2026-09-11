"use client";

import { supabase } from "@/lib/supabase/client";

/** Keep in sync with DAILY_LIMIT in src/app/api/interview/route.ts. */
export const DAILY_AI_INTERVIEW_LIMIT = 3;

/** How many AI-interview sessions this user has started today. Read-only from
 * the client — only the API route (service role) can increment it. */
export async function fetchTodayInterviewUsage(userId: string): Promise<number> {
  if (!supabase) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("interview_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();
  return (data?.count as number | undefined) ?? 0;
}
