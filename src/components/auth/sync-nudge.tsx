"use client";

import * as React from "react";
import { Cloud, X } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { useDismissed } from "@/lib/use-dismissed";
import { SignInDialog } from "@/components/auth/sign-in-dialog";

/**
 * Shown on the dashboard to signed-out visitors who already have a local
 * profile: one tap to back everything up and sync across devices.
 */
export function SyncNudge() {
  const { ready, user, loading } = useAuth();
  const { profile } = useProfile();
  const [dismissed, dismiss] = useDismissed("pmdj.sync-nudge");
  const [open, setOpen] = React.useState(false);

  if (!ready || loading || user || dismissed) return null;

  return (
    <>
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-[var(--radius)] border border-[rgba(216,179,106,0.24)] bg-[var(--gold-dim)] px-4 py-2.5 text-[13px] sm:mx-8">
        <Cloud className="h-4 w-4 shrink-0 text-gold" />
        <p className="flex-1 leading-relaxed text-text-muted">
          Your profile, résumé and tracker live on this device only.{" "}
          <button
            onClick={() => setOpen(true)}
            className="font-medium text-gold-soft hover:text-gold"
          >
            Sign in to back them up
          </button>{" "}
          and use them on another device.
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-text-faint hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <SignInDialog
        open={open}
        onOpenChange={setOpen}
        defaultEmail={profile?.email ?? ""}
      />
    </>
  );
}
