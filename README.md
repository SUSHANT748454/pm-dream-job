# PM Dream Job

A dark, editorial job board for **Product Management roles in India**. Search,
filter by level / city / work mode / domain, read the role, and apply at the
source. No login, no backend, no database.

**Live:** _(add Vercel URL after first deploy)_

---

## How it works

```
Public job sources          scripts/ingest (every 5h, GitHub Actions)
  ├─ The Muse API        ─┐
  ├─ Greenhouse boards   ─┤   fetch → filter to PM roles in India →
  ├─ Lever boards        ─┼─▶ classify (level/domain/work mode) →
  ├─ Ashby boards        ─┤   de-dupe → src/data/jobs.json → git commit
  └─ Remotive API        ─┘
                                        │
                                        ▼
                        Next.js app (App Router, SSG) on Vercel
                        src/services/jobService.ts is the only
                        thing that reads the data file — swap in
                        a real API later without touching the UI.
```

- **No API keys.** Every source is a public, no-login endpoint.
- The GitHub Actions workflow (`.github/workflows/refresh-jobs.yml`) runs the
  ingester every 5 hours and commits `src/data/jobs.json`; Vercel redeploys on
  the push.
- Jobs unseen for ~12h are marked `Expired` and hidden; after 14 days they are
  dropped.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Radix primitives ·
Vercel Web Analytics.

## Local development

```bash
npm install
npm run ingest     # populate src/data/jobs.json from live sources
npm run dev        # http://localhost:3000
```

Other scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run ingest` | refresh job data locally |

## Project structure

```
src/
  app/            routes: /, /jobs, /jobs/[slug], /companies, /companies/[slug], /about
  components/     JobCard, filters, search, analytics, UI primitives
  services/       jobService.ts — the data-access seam
  lib/            filters, search-params, analytics, utils
  data/           jobs.json (generated — committed so the site is fully static)
  types/          job.ts — the canonical data model
scripts/ingest/   source adapters + classifier + orchestrator
docs/             product decisions log
```

## Adding a company

Add an entry to `scripts/ingest/companies.ts` with its ATS (`greenhouse` /
`lever` / `ashby`) and board token. A wrong token just 404s and is skipped.

## Roadmap

Saved jobs · Google sign-in · application tracker · email alerts · AI matching.
See `docs/`.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
