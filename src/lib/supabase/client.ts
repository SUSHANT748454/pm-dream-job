import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client — a singleton, created only when the public env vars
 * are present. When they're not, `supabase` is `null` and every feature that
 * needs it degrades to localStorage-only. Nothing on the server touches this;
 * all Supabase access is client-side, so the app's routes stay static.
 *
 * The client is intentionally untyped (`SupabaseClient`, not
 * `SupabaseClient<Database>`) — query results are mapped by hand in the store
 * modules, which is simpler than keeping generated types in lockstep.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;

export const supabaseReady = supabase !== null;
