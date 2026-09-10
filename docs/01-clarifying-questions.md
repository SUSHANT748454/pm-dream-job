# PM Jobs Board — Clarifying Questions & Build Summary

_Status: awaiting answers before development starts. Date: 2026-09-10_

---

## A. Data & Content

1. **Seed job data** — Do you have a real list/CSV/Sheet of PM jobs (with real "apply" URLs), or should I
   generate ~60–100 realistic mock listings across well-known companies? If mock: the Apply button would link
   to each company's real careers page, but the specific role may not exist. OK for a validation/demo launch?
2. **Geographic focus** — PRD examples are India-centric (Bengaluru, Mumbai, Delhi NCR, Pune, Hyderabad) + Remote.
   India-first for MVP, or global? Drives filter values and seed data.
3. **Company logos** — OK to pull logos from a free logo service by company domain (with a monogram fallback),
   or will you provide logo assets?
4. **Job descriptions** — For mock data, original realistic copy written by me (not copied from real postings) — fine?

## B. Scope

5. **MVP pages** — Confirm: Landing, Jobs listing, Job details, About. Is a **Companies** page in or out for MVP?
   (Nav lists it as "future"; landing has an optional "Explore Companies" CTA.)
6. **Job details** — Dedicated page at its own route (PRD's recommendation, better for SEO/sharing) vs modal/drawer. Confirm page.
7. **MVP filters** — Location, Experience Level, Work Mode, Job Type as P0. Include **Domain** filter in MVP or defer?
8. **Sorting** — "Most Recent" only (PRD says sufficient), or also add Oldest / Company toggle?
9. **Confirm out of scope for this build**: Save Jobs, Google login, user profiles, application tracker, job alerts,
   recommendations, admin panel, job ingestion, duplicate detection, database, backend APIs.

## C. Design & Brand

10. **Product name** — Keep working title "PM Jobs Board" or use a final name?
11. **Brand assets** — Do you have a logo / color palette / font? Or should I design a clean original identity
    (I will not copy the look of the reference product)?
12. **Theme** — Light only, or light + dark mode?

## D. Analytics

13. **Provider** — GA4, Plausible, PostHog, or Vercel Analytics? Do you have an account, or should I build the
    event abstraction now (console stub) and you add keys later? Either way I implement the PRD event schema:
    `page_viewed, jobs_page_viewed, job_searched, filter_applied, job_card_clicked, job_details_viewed, apply_clicked`.

## E. Tech & Infrastructure

14. **Stack** — Confirm: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui. Static JSON behind a
    `jobService` abstraction (swappable for a real API later), per the PRD.
15. **Tooling blocker** — This machine currently has **no Git, no Node.js/npm, and no GitHub CLI installed**.
    I need Node to build/run a Next.js app and Git + GitHub CLI to create the repo and push. May I install them
    via `winget` (with your approval), or will you install them? Without Node I can write all the code but can't
    run or verify it locally.
16. **GitHub** — Which account/org should the repo live under? Desired repo name? Public or private?
    GitHub sign-in (`gh auth login`) must be done by you — I can't enter credentials.
17. **Deployment** — Vercel? Do you have a Vercel account and/or a custom domain, or deploy later?

## F. Non-functional

18. **Job detail URL format** — SEO slug like `/jobs/senior-product-manager-mumbai-microsoft-<id>` vs simple `/jobs/<id>`. Prefer slug?
19. **Landing metrics** — Compute Jobs / Companies / New-this-week live from the seed data (real counts, no fake numbers). Confirm.

---

## What I'm going to build (MVP)

A responsive **Next.js** web app — no backend, no auth, no database.

- **Landing page** — hero (headline, supporting text, "Browse Jobs" CTA), live metrics strip, featured/recent jobs, footer.
- **Jobs listing page** — search bar (title / company / location / skills, case-insensitive); left filter sidebar
  (Location, Experience Level, Work Mode, Job Type[, Domain]) that collapses to a filter sheet on mobile;
  result count; sort (Most Recent); job cards; "Load more" pagination.
- **Job card** — logo, title, company, location, experience, work mode, job category, "posted N days ago", View Job CTA.
- **Job details page** — own route with SEO metadata + OpenGraph + `JobPosting` structured data; header,
  key-info grid, description sections (About the Role / Responsibilities / Requirements / Preferred Qualifications),
  tags, "Apply on Company Website" → opens the original `applyUrl` in a new tab.
- **Empty state** — no results → message + "Clear Filters".
- **Data layer** — `src/data/jobs.json` + `companies.json` seeded to the PRD's Job/Company schema, accessed only
  through `src/services/jobService.ts` (`getJobs` with filter/search/sort/pagination, `getJobById`). Swapping in a
  real API later needs no UI changes. Types in `src/types/`.
- **Analytics** — `src/lib/analytics.ts` abstraction emitting the PRD event set; provider wired per your answer.
- Only `status: "Active"` jobs are shown.
- Responsive (mobile / tablet / desktop), performance-conscious (< 3s load), accessible.
- Delivered as a Git repo on GitHub (your account) + deployed to Vercel; this questions/decision doc committed to the repo.

### Explicitly NOT in this build
Google SSO, saved jobs, user profiles, application tracker, job alerts, AI recommendations, AI resume analysis,
admin dashboard, job ingestion pipeline, duplicate detection, backend APIs, database.

---

## What I need from you

1. Answers to the questions above — especially **data source, geography, product name, analytics provider**.
2. **Approval to install Git + Node.js + GitHub CLI** on this machine via winget (or install them yourself).
3. **GitHub**: account/org, repo name, public or private — and you run `gh auth login` yourself.
4. _(Optional now)_ Vercel account + domain, if you want it deployed under your own account.
5. _(Optional)_ Brand assets (logo, colors, font) — otherwise I design them.
6. _(Optional)_ Real job-data file (CSV / Google Sheet) — otherwise confirm mock data is acceptable.
