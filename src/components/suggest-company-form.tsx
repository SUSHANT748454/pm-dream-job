"use client";

import * as React from "react";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";

import { submitCompanySuggestion, suggestionsReady } from "@/lib/company-suggestions";
import { trackEvent } from "@/lib/analytics";

export function SuggestCompanyForm() {
  const [companyName, setCompanyName] = React.useState("");
  const [careersUrl, setCareersUrl] = React.useState("");
  const [note, setNote] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (companyName.trim().length < 2) {
      setError("Enter the company's name.");
      return;
    }
    setState("sending");
    setError(null);
    const { error } = await submitCompanySuggestion({
      companyName,
      careersUrl,
      note,
      submittedBy: email,
    });
    if (error) {
      setError(error);
      setState("idle");
      return;
    }
    setState("sent");
    trackEvent({ name: "company_suggested", props: {} });
  }

  if (state === "sent") {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
        <div>
          <p className="font-display text-lg text-text">Thanks — noted.</p>
          <p className="mt-1 text-sm text-text-muted">
            We review suggestions manually and add companies whose board has
            genuine India PM roles. No promises on timing, but it&apos;s read.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg text-text">
            Don&apos;t see a company you know is hiring PMs?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            The board is fed from a fixed list of company job boards. Tell us
            who to add — a real careers link (Greenhouse, Lever, Ashby, or
            just their careers page) helps a lot.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text">
            Company name<span className="ml-0.5 text-gold-soft">*</span>
          </label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Razorpay"
            className="w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text">
            Careers page or job board link
          </label>
          <input
            value={careersUrl}
            onChange={(e) => setCareersUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text">
            Anything else? (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. they hire APM–Director roles, mostly remote…"
            className="w-full resize-y rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text">
            Your email (optional — only if you want to know when it&apos;s added)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full max-w-xs rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {!suggestionsReady && (
        <p className="mt-4 text-xs text-amber-300">
          Suggestions aren&apos;t available on this deployment right now.
        </p>
      )}
      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={state === "sending" || !suggestionsReady}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-60"
      >
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
        Suggest this company
      </button>
    </form>
  );
}
