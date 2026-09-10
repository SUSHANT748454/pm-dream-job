/**
 * Resolve a post-onboarding redirect target from a `?next=` query param.
 * Only same-origin absolute paths are allowed (no `//host`, no `http://…`), so
 * the wizard can never be used as an open redirect.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw) return fallback;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** Read + validate the `next` param from the current URL (client only). */
export function readNextPath(fallback = "/app"): string {
  if (typeof window === "undefined") return fallback;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"), fallback);
}
