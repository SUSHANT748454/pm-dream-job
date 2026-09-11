# Job alerts (weekly digest email)

_Date: 2026-09-11._

## What it is

The one feature in this app that requires signing in — everything else works
without an account. A subscriber picks filters (location / experience level /
work mode / domain, any of which can be left empty to mean "match all") at
`/app/alerts`; every Monday a script emails them the roles first seen since
their last send that match those filters.

## Why it needs an account (and nothing else does)

An alert is meaningless without a durable address to send it to. `job_alerts`
has no localStorage fallback (unlike profile/résumé/tracker) — it's Supabase
only, gated on `useAuth().user`.

## Architecture

- **`src/lib/alerts.ts`** — client CRUD (`fetchAlertPrefs` / `saveAlertPrefs` /
  `deleteAlertPrefs`) + `useAlertPrefs()` hook. Direct Supabase calls under
  RLS (`auth.uid() = user_id`) — no sync layer needed, there's nothing to
  reconcile with localStorage.
- **`src/components/app/alert-settings.tsx`** + **`/app/alerts`** — the UI.
  Signed out → a "sign in to set up alerts" card. Signed in → the filter form.
- **`scripts/alerts/send-alerts.ts`** — the sender. Reads `job_alerts` +
  the `jobs` mirror (service role, bypasses RLS — this is the first real
  consumer of that mirror), matches, emails via **Resend's HTTP API**
  (no SDK — a plain `fetch`), stamps `last_sent_at`. Skips cleanly (exit 0,
  no error) if Supabase or Resend env vars are missing.
- **`.github/workflows/send-alerts.yml`** — runs Monday 09:00 IST
  (`30 3 * * 1` UTC) + `workflow_dispatch` for manual testing.

## Matching logic

- Lookback window = days since `last_sent_at` (capped 7–30 days; a fresh
  subscriber gets the last 7 days on their first email)
- Won't re-send within 6 days even if triggered manually more than once
- Sends nothing (silently skips, doesn't spam an empty digest) when there's
  no match

## Setup — new secrets needed

| Where | Secret | Notes |
|---|---|---|
| GitHub → repo → Settings → Secrets → Actions | `RESEND_API_KEY` | From resend.com → API Keys. **Different** from the SMTP credentials already configured for Supabase magic links — that's SMTP host/user/pass, this is a plain API key for direct sends. |
| same | `ALERTS_FROM_EMAIL` | e.g. `alerts@yourdomain.com` once a domain is verified in Resend, or `onboarding@resend.dev` for testing (that address can only deliver to the Resend account's own verified email until a domain is added). |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are reused from the jobs-mirror
setup — nothing new needed there.

## One-time DB step

Re-run `supabase/schema.sql` in the SQL Editor — it's fully idempotent, so
running the whole file again is safe; it only actually creates the new
`job_alerts` table (everything else already exists as `if not exists`).

## Testing

`Actions → Send job alerts → Run workflow` after at least one person has
saved alert preferences. Check the run log for `sent -> <email>` /
`skipped (no match / too soon)`.
