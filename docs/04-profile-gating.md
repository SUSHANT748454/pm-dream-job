# Profile-first entry (Option A)

_Date: 2026-09-10. Added after launch on <https://pm-dream-job.vercel.app>._

## Decision

Visitors set up an on-device profile **before** they can use the board. The gate
is deliberately partial so it doesn't wreck SEO or shared links:

| Surface | Behaviour without a profile |
|---|---|
| `/` landing | Hero CTA is **"Create your free profile"**. The "Fresh this week" + "Browse by" sections render blurred behind a glass card (`ProfileWall`). Stats and the companies strip stay visible. |
| `/jobs` search | `ProfileGate` → client redirect to `/welcome?next=/jobs`. |
| `/app` dashboard (+ tracker, questions, interview) | `ProfileGate` → client redirect to `/welcome?next=/app`. |
| `/jobs/[slug]`, `/companies`, `/companies/[slug]` | **Stay public.** A slim dismissible `ProfileBanner` invites setup. These are the Google entry points and the links people share. |
| `/about` | Untouched. |

"Profile" still means the same thing it always has: `localStorage` key
`pmdj.profile.v1`, written by the `/welcome` wizard. No account, no server, no
auth. The gate is 100% client-side.

## Why it's SEO-safe

Every gated component returns its `children` during the **server render and the
first (hydration) client render** — `hydrated` starts `false`. So the static
HTML that ships (and anything a crawler sees before running JS) is the full
page. The redirect/lock only happens after mount, for real humans. No hydration
mismatch (same pattern as `useProfile`).

`sitemap.ts` drops the `/jobs` listing entry (kept: 96 job + 42 company URLs).
`robots.ts` is unchanged — it still only disallows `/app` and `/welcome`.

## Onboarding changes

- The wizard reads `?next=<path>` (validated same-origin by `src/lib/next-path.ts`)
  and returns the user there on finish. Default `/app`.
- **Experience level (step 3) is now required** — it's what "tailored to your
  level" depends on. Résumé (step 2) stays optional.
- The "Skip for now → /jobs" escape hatch is removed. Back/Home still work.

## New / changed files

- `src/components/profile-gate.tsx` — redirect gate for `/jobs`, `/app`.
- `src/components/profile-wall.tsx` — homepage blurred-preview lock.
- `src/components/profile-banner.tsx` — slim nudge for public detail pages.
- `src/components/hero-ctas.tsx` — profile-aware landing hero actions
  (replaces `hero-profile-link.tsx`, deleted).
- `src/lib/next-path.ts` — `?next=` validation.
- Analytics: `profile_wall_viewed`, `profile_wall_cta_clicked`,
  `onboarding_completed { next, hasResume, level }`.

## Funnel to watch in Vercel Analytics

`profile_wall_viewed` / `profile_wall_cta_clicked` → `onboarding_completed` →
`jobs_page_viewed`. That's the wall→signup→activation rate.
