import type { Metadata } from "next";

import { TrackerBoard } from "@/components/app/tracker-board";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "Application Tracker" };

export default function TrackerPage() {
  return (
    <>
      <TrackView event={{ name: "page_viewed", props: { path: "/app/tracker" } }} />
      <TrackerBoard />
    </>
  );
}
