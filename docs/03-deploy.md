# Deploying PM Dream Job

The whole app is static (no serverless functions), so Vercel serves it from the
edge. Deploy = connect the GitHub repo once; every push then redeploys — including
the 5-hourly `chore(data): refresh jobs` commits from GitHub Actions.

## 1. Import the repo (one time, ~2 min)

1. Go to **<https://vercel.com/new>** and sign in **with GitHub** (account
   `SUSHANT748454`). Authorise Vercel for the repo if asked.
2. Under **Import Git Repository**, pick **`pm-dream-job`** → **Import**.
3. Configure Project:
   - **Framework Preset:** Next.js *(auto-detected — leave it)*
   - **Root Directory:** `./` *(leave it)*
   - **Build & Output Settings:** leave all defaults
   - **Environment Variables:** none needed. The app auto-detects its own URL on
     Vercel. *(Optional: add `NEXT_PUBLIC_SITE_URL` = your final URL, e.g.
     `https://pm-dream-job.vercel.app`, once you know it — or after adding a
     custom domain.)*
4. Click **Deploy**. First build takes ~1–2 min.

You'll get a URL like `https://pm-dream-job-<hash>.vercel.app` and a stable
`https://pm-dream-job.vercel.app`.

## 2. Turn on Web Analytics (1 click)

Project → **Analytics** tab → **Enable Web Analytics**. The code is already wired
(`@vercel/analytics`), so page views + the funnel events start flowing on the
next deploy. (Until it's enabled you'll see a harmless `/_vercel/insights/*` 404
in the browser console — that's expected.)

## 3. Verify

Open the deploy URL and click through: landing → **Browse jobs** → a job →
**Apply** ; then **Companies**, **About**, **/welcome**, and **/app**. All
navigation should be instant.

## 4. Custom domain (optional)

Project → **Settings → Domains** → add your domain, follow the DNS steps. Then set
`NEXT_PUBLIC_SITE_URL` to that domain (Settings → Environment Variables) and
redeploy so canonical URLs / the sitemap use it.

## 5. GitHub Actions (nothing to do)

`.github/workflows/refresh-jobs.yml` already runs every 5 h with the repo's
built-in token, commits `src/data/jobs.json` when jobs change, and that commit
triggers a Vercel redeploy automatically. To force a refresh now: repo →
**Actions** → **Refresh jobs** → **Run workflow**.

## CLI alternative (one-off manual deploy)

```bash
npx vercel login      # browser auth
npx vercel --prod     # from the project directory
```

This deploys but does **not** wire up push-triggered redeploys — for that you
still need step 1 (connect the Git repo in the dashboard).
