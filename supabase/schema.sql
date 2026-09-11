-- PM Dream Job — Supabase schema
-- Run this once in the Supabase SQL Editor (or `supabase db push`).
-- Safe to re-run: every statement is idempotent.

--------------------------------------------------------------------------------
-- JOBS (public data — mirrored from the ingestion script)
--------------------------------------------------------------------------------

create table if not exists public.companies (
  id          text primary key,
  name        text not null,
  data        jsonb not null default '{}'::jsonb,   -- full Company object
  updated_at  timestamptz not null default now()
);

create table if not exists public.jobs (
  id             text primary key,
  slug           text not null unique,
  title          text,
  company_id     text references public.companies (id) on delete set null,
  data           jsonb not null,                     -- full Job object
  posted_at      date,
  status         text not null default 'Active',
  first_seen_at  date,
  last_seen_at   date,
  updated_at     timestamptz not null default now()
);

create index if not exists jobs_status_posted_idx on public.jobs (status, posted_at desc);
create index if not exists jobs_company_idx on public.jobs (company_id);

alter table public.companies enable row level security;
alter table public.jobs enable row level security;

-- Anyone (even anon) may read jobs + companies. Writes happen only with the
-- service_role key (used by the ingestion script), which bypasses RLS — so we
-- add NO insert/update/delete policy here on purpose.
drop policy if exists "companies are public" on public.companies;
create policy "companies are public" on public.companies for select using (true);

drop policy if exists "jobs are public" on public.jobs;
create policy "jobs are public" on public.jobs for select using (true);

--------------------------------------------------------------------------------
-- USER DATA (per-account — synced from the browser when signed in)
--------------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  full_name           text,
  email               text,
  phone               text,
  country             text,
  hear_about          text,
  experience_years    text,
  current_designation text,
  resume_name         text,
  updated_at          timestamptz not null default now()
);

create table if not exists public.resumes (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  text        text not null,
  file_name   text,
  source      text,
  chars       integer,
  updated_at  timestamptz not null default now()
);

create table if not exists public.applications (
  user_id     uuid not null references auth.users (id) on delete cascade,
  job_id      text not null,
  slug        text,
  title       text,
  company     text,
  company_id  text,
  location    text,
  apply_url   text,
  source      text,
  stage       text not null,
  note        text,
  added_at    timestamptz,
  applied_at  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index if not exists applications_user_updated_idx
  on public.applications (user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.applications enable row level security;

-- Each signed-in user can only see / change their own rows.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own resume" on public.resumes;
create policy "own resume" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- JOB ALERTS (weekly digest email — requires sign-in, since it needs a
-- durable identity + address to send to; everything else in this app works
-- without an account)
--------------------------------------------------------------------------------

create table if not exists public.job_alerts (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  email             text not null,
  -- Empty array on any of these = "no filter on this dimension" (match all).
  locations         text[] not null default '{}',
  experience_levels text[] not null default '{}',
  work_modes        text[] not null default '{}',
  domains           text[] not null default '{}',
  enabled           boolean not null default true,
  last_sent_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.job_alerts enable row level security;

-- Managed entirely by the signed-in owner from the client...
drop policy if exists "own job alert" on public.job_alerts;
create policy "own job alert" on public.job_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ...the weekly sender script uses the service_role key (bypasses RLS) to read
-- every enabled row and stamp last_sent_at, so no separate policy is needed for it.

--------------------------------------------------------------------------------
-- COMPANY SUGGESTIONS ("don't see your company?" — public, no sign-in)
--------------------------------------------------------------------------------

create table if not exists public.company_suggestions (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null,
  careers_url   text,
  note          text,
  submitted_by  text,
  status        text not null default 'new', -- new | added | rejected | duplicate
  created_at    timestamptz not null default now()
);

alter table public.company_suggestions enable row level security;

-- Anyone can submit; nobody (not even the submitter) can read them back via
-- the public key — that keeps it from being a scrapeable public list. Review
-- happens in the Supabase dashboard (as the project owner) or a service-role
-- script, both of which bypass RLS.
drop policy if exists "anyone can suggest a company" on public.company_suggestions;
create policy "anyone can suggest a company" on public.company_suggestions
  for insert with check (true);
