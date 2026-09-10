# Supabase setup

The app runs fine with **no** Supabase configured (localStorage only, no sign-in).
Add it to get accounts + cross-device sync.

## 1. Create the project

supabase.com → New project. Note the **Project URL** and, from
**Project Settings → API**, the **anon/public** key and the **service_role** key.

## 2. Create the tables

**SQL Editor** → paste `schema.sql` from this folder → Run. (Idempotent — safe to
re-run.)

## 3. Auth

**Authentication → Providers → Email**: enabled (default).
**Authentication → URL Configuration → Redirect URLs**, add:

```
http://localhost:3000/auth/callback
https://pm-dream-job.vercel.app/auth/callback
```

(and your custom domain's `/auth/callback` if you add one).

## 4. Env vars

| Where | Vars |
|---|---|
| `.env.local` (local dev) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Vercel → Project → Settings → Environment Variables | same two (all environments) |
| GitHub → repo → Settings → Secrets → Actions | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

The `NEXT_PUBLIC_*` pair is safe to expose. The **service_role** key is a secret —
only the ingestion workflow uses it, and only to write `jobs` / `companies`.

## What syncs

| Data | Table | When |
|---|---|---|
| Profile | `profiles` | on save, if signed in |
| Résumé text | `resumes` | on save, if signed in |
| Application tracker | `applications` | on every change, if signed in |
| Jobs + companies | `jobs`, `companies` | every ingestion run (service role) |

Signed out, everything stays in localStorage exactly as before. First sign-in
merges local data up. RLS keeps each user's rows private; `jobs`/`companies` are
world-readable.
