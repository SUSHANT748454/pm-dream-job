# ATS match score (on-device)

_Date: 2026-09-10._

## What it is

Every job shows a **High / Medium / Low** match against the visitor's résumé:

| Score | Band |
|---|---|
| 80–100 | **High** |
| 60–79 | **Medium** |
| 0–59 | **Low** |

It is **not** a language-model judgement and needs no API or backend. It's a
deterministic keyword / skills overlap between the résumé text and the job
description — the same mechanism a real ATS keyword filter uses — computed in
the browser (`src/lib/ats.ts`).

## Scoring (`scoreJob`)

Weighted keyword set per job: `skills` ×3, `domain` ×2.5, `tags` ×2, title terms
×2, requirements + preferred ×1.6, responsibilities ×1 → top 45 terms. Résumé is
tokenised to unigrams + bigrams.

```
raw = 0.45·skillsCoverage + 0.30·keywordCoverage + 0.10·domainMatch + 0.15·experienceFit
score = round(min(100, raw · 100 · 1.08))
```

`experienceFit` compares the profile's experience band to the job's
`experienceMin/Max` (overlap → 1, within 2 yrs → 0.6, else 0.3, unknown → 0.8).

Returns `{ score, band, matched[], missing[] }` — `matched`/`missing` drive the
"in your résumé" / "worth adding" lists on the job detail page.

## Where the CV comes from

The résumé step now **parses the file to text in the browser** and stores it —
plus a paste-text fallback:

- `.pdf` → `pdfjs-dist` (dynamic import, worker bundled same-origin)
- `.docx` → `mammoth` (dynamic import)
- `.txt` / `.md` / `.rtf` → native
- `.doc` → asked to convert or paste

Both parsers are lazy — they only load when someone actually uploads that type,
so the initial bundle is untouched.

## Storage — still 100% on-device

New localStorage key **`pmdj.resume.v1`**: `{ text, fileName?, source, chars, updatedAt }`.
The résumé **file is never uploaded**; only the extracted text is kept, and only
in this browser. `useResume()` mirrors the `useProfile()` effect-hydration
pattern. Users can Replace / Remove it independently of the profile.

`src/lib/profile.ts` still keeps `resumeName` for display; `resumeSize` now holds
the character count.

## Surfaces

- `MatchBadge` on every job card (`/jobs`) and dashboard list row
- `/jobs` gains a **"Best match"** sort; the dashboard gains a Newest / Best
  match toggle — both only when a résumé is loaded
- `MatchBreakdown` on the job detail page and the dashboard detail pane —
  score dial + matched/missing keyword chips, or a `ResumePrompt` if there's
  no résumé yet
- No résumé → cards show no badge; a `ResumePrompt` card invites upload

## Analytics

`resume_parsed { type, ok }`, `ats_scored { band, score }`. No résumé text or
PII is ever sent — Vercel only sees the band + number.
