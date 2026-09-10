"use client";

import { useEffect, useRef } from "react";

import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Fires a single analytics event when it mounts (and again if the `key` prop
 * changes). Drop it into a server-rendered page to record a view.
 */
export function TrackView({ event }: { event: AnalyticsEvent }) {
  const serialized = JSON.stringify(event);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === serialized) return;
    last.current = serialized;
    trackEvent(JSON.parse(serialized) as AnalyticsEvent);
  }, [serialized]);

  return null;
}
