"use client";

import * as React from "react";
import { BellRing, Check, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { useAlertPrefs } from "@/lib/alerts";
import { LOCATIONS, EXPERIENCE_LEVELS, WORK_MODES, DOMAINS } from "@/lib/filters";
import { relativeDate } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { cn } from "@/lib/utils";

export function AlertSettings() {
  const { ready, user } = useAuth();
  const { profile } = useProfile();
  const { prefs, loading, save, remove } = useAlertPrefs();
  const [signInOpen, setSignInOpen] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [locations, setLocations] = React.useState<Set<string>>(new Set());
  const [levels, setLevels] = React.useState<Set<string>>(new Set());
  const [modes, setModes] = React.useState<Set<string>>(new Set());
  const [domains, setDomains] = React.useState<Set<string>>(new Set());
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time form hydration from loaded prefs */
    // Always the account's own email — never trust a previously-stored
    // value here, since older rows (from before this field was locked down)
    // could hold a different address, and the DB now rejects a mismatch.
    setEmail(profile?.email || user?.email || "");
    if (prefs) {
      setLocations(new Set(prefs.locations));
      setLevels(new Set(prefs.experienceLevels));
      setModes(new Set(prefs.workModes));
      setDomains(new Set(prefs.domains));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [prefs, user, profile?.email]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
          <BellRing className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-lg text-text">
          Get a weekly email when matching roles show up
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
          This is the one thing on PM Dream Job that needs an account — we need
          somewhere to send it. Everything else (search, tracker, résumé
          matching) still works without signing in.
        </p>
        <button
          onClick={() => setSignInOpen(true)}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-4 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft"
        >
          Sign in to set up alerts
        </button>
        <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-text-muted">
        Loading your alert…
      </div>
    );
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error } = await save({
      email: email.trim(),
      locations: [...locations],
      experienceLevels: [...levels],
      workModes: [...modes],
      domains: [...domains],
      enabled: true,
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setSaved(true);
    trackEvent({
      name: "alert_saved",
      props: {
        locations: locations.size,
        levels: levels.size,
        modes: modes.size,
        domains: domains.size,
      },
    });
  }

  async function onTurnOff() {
    setBusy(true);
    await remove();
    setBusy(false);
    trackEvent({ name: "alert_removed" });
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg text-text">Weekly job alert</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            Every Monday, an email with roles that were newly added this week
            and match the filters below. Leave a group empty to match any.
          </p>
          {prefs?.lastSentAt && (
            <p className="mt-1 text-xs text-text-faint">
              Last sent {relativeDate(prefs.lastSentAt)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-medium text-text">
          Send alerts to
        </label>
        <div className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-text-muted">
          {email || "—"}
        </div>
        <p className="mt-1.5 text-xs text-text-faint">
          Always your sign-in address, so this can&apos;t be pointed at
          someone else&apos;s inbox.
        </p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <FilterGroup label="Location" options={LOCATIONS as readonly string[]} selected={locations} onToggle={(v) => toggle(setLocations, v)} />
        <FilterGroup label="Experience level" options={EXPERIENCE_LEVELS} selected={levels} onToggle={(v) => toggle(setLevels, v)} />
        <FilterGroup label="Work mode" options={WORK_MODES} selected={modes} onToggle={(v) => toggle(setModes, v)} />
        <FilterGroup label="Domain" options={DOMAINS} selected={domains} onToggle={(v) => toggle(setDomains, v)} />
      </div>

      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={onSave}
          disabled={busy || !email.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-4 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {prefs ? "Update alert" : "Turn on weekly alert"}
        </button>
        {prefs && (
          <button
            onClick={onTurnOff}
            disabled={busy}
            className="text-[13px] text-text-muted hover:text-text disabled:opacity-60"
          >
            Turn off alerts
          </button>
        )}
        {saved && !error && (
          <span className="text-[13px] text-emerald-400">Saved.</span>
        )}
      </div>
    </div>
  );
}

function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
        {label}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.has(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                on
                  ? "border-gold bg-[var(--gold-dim)] text-gold-soft"
                  : "border-[var(--border-strong)] text-text-muted hover:text-text",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
