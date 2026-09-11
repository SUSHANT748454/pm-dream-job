"use client";

import * as React from "react";
import { CheckCircle2, X } from "lucide-react";

import {
  useTracker,
  readPendingApplyClick,
  type ApplyClickInfo,
} from "@/lib/tracker";
import { trackEvent } from "@/lib/analytics";

/**
 * Mounted once, globally. The Apply button opens the source posting in a new
 * tab, so there's no way to know whether the visitor actually applied — this
 * asks, once, when they come back to this tab. Closes the tracker's biggest
 * data-integrity gap without needing to touch the source site at all.
 */
export function ApplyReturnPrompt() {
  const tracker = useTracker();
  const [pending, setPending] = React.useState<ApplyClickInfo | null>(null);

  React.useEffect(() => {
    let left = false;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        left = true;
        return;
      }
      if (document.visibilityState === "visible" && left) {
        left = false;
        const info = readPendingApplyClick();
        if (info) setPending(info);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!pending) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-pop)] animate-in sm:inset-x-auto sm:right-6 sm:left-auto">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
        <CheckCircle2 className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-text">
          Did you apply to <span className="font-medium">{pending.title}</span>{" "}
          at {pending.company}?
        </p>
        <div className="mt-2.5 flex items-center gap-4">
          <button
            onClick={() => {
              tracker.markApplied(pending);
              trackEvent({ name: "apply_confirmed", props: { jobId: pending.jobId } });
              setPending(null);
            }}
            className="rounded-[var(--radius)] bg-gold px-3 py-1.5 text-[13px] font-semibold text-[#1a1406] hover:bg-gold-soft"
          >
            Yes, mark applied
          </button>
          <button
            onClick={() => setPending(null)}
            className="text-[13px] text-text-muted hover:text-text"
          >
            Not yet
          </button>
        </div>
      </div>
      <button
        onClick={() => setPending(null)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-text-faint hover:text-text"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
