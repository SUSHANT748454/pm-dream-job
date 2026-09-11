import type { Metadata } from "next";

import { AlertSettings } from "@/components/app/alert-settings";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "Job Alerts" };

export default function AlertsPage() {
  return (
    <div className="px-4 py-5 sm:px-8">
      <TrackView event={{ name: "page_viewed", props: { path: "/app/alerts" } }} />
      <h1 className="font-display text-2xl tracking-tight text-text">
        Job Alerts
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        A weekly email so you don&apos;t have to keep checking back.
      </p>
      <div className="mt-6 max-w-xl">
        <AlertSettings />
      </div>
    </div>
  );
}
