# PM Jobs Board — Decisions Log (v2)

_Date: 2026-09-10. Updated after round 1 answers._

## Locked decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Data | **Live job data from the web**, refreshed **every 5 hours** (not static seed data) |
| 2 | Geography | **India-focused** |
| 3 | Company logos | Free logo service by domain + monogram fallback |
| 4 | Companies page | **In scope**, professional design |
| 5 | Domain filter | **Included** in MVP |
| 6 | Out of scope | Confirmed: no auth/SSO, saved jobs, profiles, tracker, alerts, AI features, admin UI |
| 7 | Design | Claude designs it — **dark theme, premium / elite / high-standard**, web references allowed |
| 8 | Theme | Dark |
| 9 | Analytics | Claude picks lowest-effort → **Vercel Web Analytics** (1 pkg, 1 component, dashboard toggle, cookieless) + PRD custom events layered on `track()` |
| 10 | Stack | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui — confirmed |
| 11 | Repo | New GitHub repo on the connected account |
| 12 | Hosting | Vercel |
| 13 | Job detail URL | SEO slug, e.g. `/jobs/senior-product-manager-razorpay-bengaluru-a1b2c3` |
| 14 | Profile-first entry (post-launch) | Homepage + `/jobs` + `/app` gated behind on-device profile setup; job/company detail pages stay public with a nudge. See `04-profile-gating.md`. |
| 15 | ATS match score (post-launch) | Résumé parsed to text in-browser (pdfjs/mammoth, lazy) + paste fallback, stored on-device only (`pmdj.resume.v1`). Deterministic keyword/skills overlap → High (80+) / Medium (60–80) / Low (0–60) per job. No API. See `05-ats-match.md`. |

## Data sourcing — proposed (needs your OK)

Directly scraping LinkedIn / Naukri / Indeed / Foundit **is not viable** — their terms prohibit it and
they block bots within minutes. Compliant plan that still gives real, fresh, India PM jobs:

1. **Adzuna API** (primary) — free instant key, `country=in`, returns company / location / salary / apply URL.
2. **Curated public ATS boards** (secondary) — Greenhouse / Lever / Ashby JSON feeds for ~30–50 Indian tech
   companies that hire PMs (Razorpay, CRED, Groww, PhonePe, Meesho, Swiggy, Zomato, Navi, Zepto, Postman,
   Freshworks, Chargebee, BrowserStack, …). Public, allowed, direct-apply links.
3. **Jooble API** (optional) — free key, aggregates more India boards.

Pipeline: fetch → filter to PM titles (APM → Director/Head of Product, incl. Product Owner) + India →
normalise to the PRD Job schema → dedupe on `company + normalised title + city` → write `public/data/jobs.json`.

## Refresh mechanism — proposed

**GitHub Actions scheduled workflow**, `cron: "0 */5 * * *"` → runs the fetch script → commits updated
`jobs.json` → Vercel auto-deploys.

- Free. (Vercel's own cron on the Hobby/free plan is limited to **once per day**, so it can't do 5-hourly
  without Vercel Pro at \$20/mo. GitHub Actions avoids that.)
- Jobs not seen for 2 consecutive refreshes → marked expired and dropped from the listing.
- The app stays backend-free / DB-free: it just reads a JSON file rebuilt every 5 hours.

## Still needed from you

1. **Approve installing dev tooling** on this machine via winget: **Git**, **Node.js LTS**, **GitHub CLI**
   (none are currently installed). Or install them yourself.
2. **GitHub**: confirm the account/username + repo name (suggest `pm-jobs-board`), **private or public**.
   You run `gh auth login` (browser) — I can't enter credentials.
3. **Adzuna API key**: sign up free at developer.adzuna.com → send me `app_id` + `app_key`
   (stored as Vercel + GitHub Actions secrets, never committed).
4. **Vercel**: easiest path — after the repo exists, import it at vercel.com/new and enable Web Analytics.
   No token needed if Vercel's GitHub integration auto-deploys on push.
5. **Product name**: keep "PM Jobs Board" or a final name? Any domain?
6. Confirm the **data-sourcing plan above** (API + ATS boards, not LinkedIn/Naukri scraping).
