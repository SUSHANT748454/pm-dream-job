# Supabase — accounts + sync

_Date: 2026-09-10._

## Decision

Add a real backend without giving up the static architecture:

- **`@supabase/supabase-js` in the browser only.** No server component, route
  handler, or middleware touches Supabase — every route stays `○`/`●` static.
- **Degrades to nothing.** If `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` aren't
  set, `supabase` is `null`, the sign-in UI hides, and the app is
  localStorage-only exactly as before. The build never depends on Supabase.
- **Auth = email magic link** (`signInWithOtp`), PKCE, session in localStorage.
  Callback at `/auth/callback` (a static page whose client waits for the
  session, then redirects).
- **User data = hybrid, not a wall.** Profile setup still works locally; the
  profile gate is unchanged. Signing in *syncs* and pulls on other devices.

## Sync layer — `src/lib/synced-store.ts`

`useSyncedStore` wraps the "localStorage first, Supabase when signed in" pattern.
`useProfile`, `useResume`, `useTracker` are refactored onto it and keep their
existing return shapes (+ a new `syncing` flag).

- Every write hits localStorage synchronously (offline-safe) and, if signed in,
  fire-and-forgets an upsert (local stays authoritative if the network fails).
- On sign-in: fetch the remote row. Remote non-empty → it wins (tracker merges
  per-job by `updatedAt`). Remote empty + local present → migrate local up.
- Sign out → keep local as the cache; nothing is wiped.

## Tables (`supabase/schema.sql`)

| Table | RLS |
|---|---|
| `companies`, `jobs` | public `select`; writes only via service_role (ingestion) |
| `profiles`, `resumes`, `applications` | `auth.uid() = user_id` for all ops |

`jobs`/`companies` store the full object as `jsonb` (`data`) plus a few promoted
columns for indexing.

## Jobs pipeline

`scripts/ingest/` gains `supabase-sink.ts` — after writing `jobs.json` it upserts
`jobs` + `companies` with the service-role key (skipped if env unset) and prunes
removed rows. **The website still reads the committed `jobs.json` snapshot** —
static, SEO-preserving. The tables are the source of truth for future
server-side features and the `applications` FK space.

`refresh-jobs.yml`: added `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` env from
secrets, and **dropped `[skip ci]` from the refresh commit** — Vercel honours
`[skip ci]` and was not redeploying on job refreshes, so new jobs never reached
the live site. Now they do.

## Auth UI

- `AuthProvider` (root layout) → `useAuth()` = `{ ready, loading, user, session, signInWithEmail, signOut }`
- `AccountMenu` in the header — "Sign in" (magic-link dialog) / email + sign out. Hidden when Supabase unconfigured.
- `SyncNudge` on the dashboard — signed-out visitors with a local profile.

## Analytics

`sign_in_link_sent`, `signed_in`, `signed_out`. No PII.

## Setup

See `supabase/README.md`.
