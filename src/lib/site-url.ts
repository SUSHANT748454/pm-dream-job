/**
 * The canonical origin for this deployment. Prefers an explicit
 * NEXT_PUBLIC_SITE_URL, then Vercel's built-in production URL, then a fallback.
 * Tolerates a value with a missing protocol.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "https://pm-dream-job.vercel.app";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "https://pm-dream-job.vercel.app";
  }
}
