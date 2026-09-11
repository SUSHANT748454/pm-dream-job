import type { ExperienceBand } from "@/lib/profile";

/**
 * Light, best-effort extraction from résumé text — used to prefill the
 * onboarding form (résumé-first flow) so the visitor confirms instead of
 * retyping. Never guessed with low confidence; returns null rather than a
 * wrong value.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function guessEmail(text: string): string | null {
  const m = text.match(EMAIL_RE);
  return m ? m[0] : null;
}

// Contact info is almost always near the top; scanning the whole document
// risks matching a phone-shaped number buried in a project description.
const PHONE_RE = /(\+?\d[\d\s.-]{8,14}\d)/g;

export function guessPhone(text: string): string | null {
  const head = text.slice(0, 600);
  for (const m of head.matchAll(PHONE_RE)) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13) return m[1].trim();
  }
  return null;
}

const RANGE_RE = /(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*years?/i;
const PLUS_RE = /(\d{1,2})\s*\+\s*years?/i;
const SINGLE_RE =
  /(\d{1,2})\s*years?\s+(?:of\s+)?(?:relevant\s+|total\s+)?(?:work\s+)?experience/i;

function yearsToBand(years: number): ExperienceBand {
  if (years < 2) return "0-2 years";
  if (years < 5) return "2-5 years";
  if (years < 8) return "5-8 years";
  if (years < 12) return "8-12 years";
  return "12+ years";
}

export function guessExperienceBand(text: string): ExperienceBand | null {
  const t = text.replace(/\s+/g, " ");

  const range = t.match(RANGE_RE);
  if (range) return yearsToBand(Number(range[2]));
  const plus = t.match(PLUS_RE);
  if (plus) return yearsToBand(Number(plus[1]));
  const single = t.match(SINGLE_RE);
  if (single) return yearsToBand(Number(single[1]));

  // Fallback: no explicit statement — infer from the earliest year mentioned
  // (a reasonable proxy for career start on a reverse-chronological résumé).
  const now = new Date().getFullYear();
  const years = [...t.matchAll(/\b(19[9]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1]));
  const plausible = years.filter((y) => y >= now - 35 && y <= now);
  if (plausible.length === 0) return null;
  const estimated = now - Math.min(...plausible);
  if (estimated < 0 || estimated > 40) return null;
  return yearsToBand(estimated);
}

export interface ResumeGuess {
  email: string | null;
  phone: string | null;
  experienceYears: ExperienceBand | null;
}

export function guessFromResume(text: string): ResumeGuess {
  return {
    email: guessEmail(text),
    phone: guessPhone(text),
    experienceYears: guessExperienceBand(text),
  };
}
