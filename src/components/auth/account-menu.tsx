"use client";

import * as React from "react";
import { Cloud, CloudOff, LogOut, Check } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useProfile, firstName } from "@/lib/profile";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { cn } from "@/lib/utils";

/**
 * Header account control. Hidden entirely when Supabase isn't configured.
 *  - signed out → "Sign in" (opens the magic-link dialog)
 *  - signed in  → email + "synced" state + sign out
 */
export function AccountMenu({ className }: { className?: string }) {
  const { ready, loading, user, signOut } = useAuth();
  const { profile } = useProfile();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  if (!ready) return null;
  if (loading) return <div className={cn("h-8 w-8", className)} />;

  if (!user) {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className={cn(
            "hidden items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] text-text-muted transition-colors hover:text-text sm:inline-flex",
            className,
          )}
        >
          <Cloud className="h-3.5 w-3.5" />
          Sign in
        </button>
        <SignInDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultEmail={profile?.email ?? ""}
        />
      </>
    );
  }

  const label = firstName(profile) ?? user.email?.split("@")[0] ?? "Account";

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="hidden items-center gap-2 rounded-full border border-[var(--border-strong)] py-1 pl-1 pr-3 text-sm text-text-muted transition-colors hover:text-text sm:inline-flex"
        title={user.email ?? undefined}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--gold-dim)] text-[11px] font-medium text-gold-soft">
          {(user.email ?? "?").charAt(0).toUpperCase()}
        </span>
        {label}
      </button>

      {menuOpen && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-1.5 shadow-[var(--shadow-pop)]">
            <div className="px-2.5 py-2">
              <p className="truncate text-[13px] text-text">{user.email}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-emerald-400">
                <Check className="h-3 w-3" /> Profile, résumé &amp; tracker synced
              </p>
            </div>
            <button
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-text-muted hover:bg-[var(--bg-card)] hover:text-text"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
            <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] leading-snug text-text-faint">
              <CloudOff className="mr-1 inline h-3 w-3" />
              Signing out keeps everything on this device.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
