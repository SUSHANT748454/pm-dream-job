# Profile gating — superseded

_Original decision: 2026-09-10. Reversed: 2026-09-11._

## What changed

The original version of this doc described "Option A": `/jobs` and `/app`
redirected anyone without a local profile to `/welcome`, and the homepage
blurred its featured-jobs section behind a locked-preview card
(`ProfileWall`) until a profile existed.

**That's been removed.** After a product review, browsing is free for
everyone:

- `/jobs`, `/app` (and every sub-page — tracker, question bank, interview) —
  open, no redirect, no profile required
- Homepage — the featured-jobs section renders in full; a dismissible
  `ProfileBanner` invites profile setup instead of blurring the content
- `ProfileGate` and `ProfileWall` were deleted (`git log` has them if needed)

**Why:** gating the entire browsing experience taxed the wrong moment.
Candidates browse promiscuously before they commit to anything — the value
(fresh, filterable PM roles) should be visible before asking for identity.
A profile is now purely an upsell for the things that genuinely need one:
ATS match scoring (needs a résumé), the application tracker's cross-device
sync (needs sign-in), and job alerts (needs sign-in — see
`08-job-alerts.md`). Nothing else requires it.

## What's unchanged

- `ProfileNudge`, `ProfileBanner`, `ResumePrompt`, `SyncNudge` — all still
  live, all still contextual (dismissible, non-blocking)
- The onboarding wizard at `/welcome` is untouched — same 3 steps, same
  `?next=` redirect-back behavior, still reachable from the header's
  "Create profile" button and every contextual nudge
- `sitemap.ts` now includes `/jobs` again (it's public, so it's a useful
  crawl target once more)
