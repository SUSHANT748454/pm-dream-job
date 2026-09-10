"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Mail, Loader2, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInDialog({
  open,
  onOpenChange,
  defaultEmail = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = React.useState(defaultEmail);
  const [state, setState] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset the form each time the dialog opens */
    if (open) {
      setState("idle");
      setError(null);
      setEmail(defaultEmail);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, defaultEmail]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setState("sending");
    setError(null);
    const { error } = await signInWithEmail(email);
    if (error) {
      setError(error);
      setState("idle");
      return;
    }
    setState("sent");
    trackEvent({ name: "sign_in_link_sent", props: {} });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(26rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-pop)]">
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-display text-lg text-text">
              {state === "sent" ? "Check your inbox" : "Sign in to sync"}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-text-faint hover:text-text">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {state === "sent" ? (
            <div className="mt-4 flex items-start gap-3 text-sm text-text-muted">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p>
                We sent a sign-in link to <span className="text-text">{email}</span>.
                Open it on this device to finish — your profile, résumé and tracker
                will sync automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4">
              <Dialog.Description className="text-[13px] leading-relaxed text-text-muted">
                Your profile, résumé and application tracker stay on this device.
                Sign in with a one-time link — no password — to back them up and
                pick up on another device.
              </Dialog.Description>
              <div className="relative mt-4">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none"
                />
              </div>
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={state === "sending"}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-gold py-2.5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-60"
              >
                {state === "sending" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Email me a sign-in link"
                )}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
