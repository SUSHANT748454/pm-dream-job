"use client";

import { track as vercelTrack } from "@vercel/analytics";

/**
 * Thin analytics abstraction. Every product event in the PRD funnel goes
 * through `trackEvent` so the provider can be swapped without touching call
 * sites. Today it forwards to Vercel Web Analytics custom events.
 */

export type AnalyticsEvent =
  | { name: "page_viewed"; props?: { path?: string } }
  | { name: "jobs_page_viewed"; props?: { results?: number; hasQuery?: boolean } }
  | { name: "job_searched"; props: { query: string; results: number } }
  | { name: "filter_applied"; props: { filter: string; value: string; active: boolean } }
  | { name: "job_card_clicked"; props: { jobId: string; slug: string; company: string } }
  | { name: "job_details_viewed"; props: { jobId: string; slug: string; company: string } }
  | { name: "apply_clicked"; props: { jobId: string; slug: string; company: string; source: string } };

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(event: AnalyticsEvent): void {
  const props = ("props" in event ? event.props : undefined) as EventProps | undefined;
  try {
    vercelTrack(event.name, props);
  } catch {
    // never let analytics break the UI
  }
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event.name, props ?? {});
  }
}
