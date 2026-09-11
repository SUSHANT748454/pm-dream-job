"use client";

import { supabase, supabaseReady } from "@/lib/supabase/client";

/**
 * "Don't see your company?" intake — public, no sign-in required. Writes
 * straight to the `company_suggestions` table (insert-only RLS policy); reads
 * are reserved for the owner via the Supabase dashboard or a service-role
 * script, so this module never fetches anything back.
 */

export interface CompanySuggestionInput {
  companyName: string;
  careersUrl?: string;
  note?: string;
  submittedBy?: string;
}

export { supabaseReady as suggestionsReady };

export async function submitCompanySuggestion(
  input: CompanySuggestionInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Not available right now." };
  const { error } = await supabase.from("company_suggestions").insert({
    company_name: input.companyName.trim(),
    careers_url: input.careersUrl?.trim() || null,
    note: input.note?.trim() || null,
    submitted_by: input.submittedBy?.trim() || null,
  });
  return { error: error?.message ?? null };
}
