# Deploying PM Dream Job

## 1. Vercel (hosting)

1. Go to <https://vercel.com/new> and sign in with GitHub (account **SUSHANT748454**).
2. **Import** the `pm-dream-job` repository.
3. Framework preset: **Next.js** (auto-detected). Leave build/output settings default.
4. Environment variables — add one:
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | your final URL, e.g. `https://pm-dream-job.vercel.app` (or a custom domain) |
5. Click **Deploy**.
6. After it deploys, open the project → **Analytics** tab → **Enable Web Analytics**
   (one click; the code is already wired via `@vercel/analytics`).

Every push to `main` now redeploys automatically — including the 5-hourly data
commits from GitHub Actions.

## 2. GitHub Actions (job refresh)

Nothing to configure. `.github/workflows/refresh-jobs.yml` runs every 5 hours
using the repo's built-in `GITHUB_TOKEN`. To run it immediately: repo →
**Actions** → **Refresh jobs** → **Run workflow**.

> Note: GitHub disables scheduled workflows after 60 days of no repo activity.
> The 5-hourly commits keep it active, so this only matters if ingestion breaks
> for two months.

## 3. Custom domain (optional)

Vercel project → **Settings → Domains** → add your domain and follow the DNS
instructions. Then update `NEXT_PUBLIC_SITE_URL` to match and redeploy.

## Adding more job sources later

Edit `scripts/ingest/companies.ts` (ATS board tokens) or add a source adapter in
`scripts/ingest/sources.ts`. Run `npm run ingest` locally to preview, commit,
and the next deploy picks it up.
