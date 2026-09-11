"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Asterisk,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Mail,
  Phone,
  Globe,
  Briefcase,
  UploadCloud,
  FileText,
  X,
} from "lucide-react";

import {
  COUNTRIES,
  EXPERIENCE_BANDS,
  HEAR_ABOUT,
  bandToLevel,
  readProfile,
  writeProfile,
  type ExperienceBand,
  type SeekerProfile,
} from "@/lib/profile";
import { trackEvent } from "@/lib/analytics";
import { readNextPath } from "@/lib/next-path";
import { writeResume, clearResume } from "@/lib/resume";
import { useResumeUpload, type ParsedResume } from "@/lib/use-resume-upload";
import { guessFromResume, type ResumeGuess } from "@/lib/resume-extract";
import { cn } from "@/lib/utils";

// Résumé first: parsing it lets the next two steps arrive pre-filled instead
// of asking the visitor to retype what's already on the page they just
// uploaded.
const STEPS = [
  { id: "resume", n: 1, title: "Your résumé", sub: "Kept on this device", optional: true },
  { id: "basic", n: 2, title: "Basic details", sub: "Name, email, and country", optional: false },
  { id: "experience", n: 3, title: "Your experience", sub: "Level and current role", optional: false },
] as const;

type Draft = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  hearAbout: string;
  resumeName: string;
  resumeSize: number;
  experienceYears: ExperienceBand | "";
  currentDesignation: string;
};

// Pure — takes the profile rather than reading localStorage itself, so it can
// produce the SSR-identical "nothing yet" draft as well as the hydrated one.
function initialDraft(p: SeekerProfile | null): Draft {
  return {
    fullName: p?.fullName ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    country: p?.country ?? "India",
    hearAbout: p?.hearAbout ?? "",
    resumeName: p?.resumeName ?? "",
    resumeSize: p?.resumeSize ?? 0,
    experienceYears: p?.experienceYears ?? "",
    currentDesignation: p?.currentDesignation ?? "",
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OnboardingWizard() {
  const router = useRouter();
  // Both start at the SSR-equivalent "no profile yet" state and hydrate from
  // localStorage in an effect — reading it during the initial render (the old
  // code did, via useMemo/useState initializers) can disagree with the server
  // render whenever a profile already exists in this browser, which throws a
  // real hydration error (React #418), not just a cosmetic flash.
  const [existing, setExisting] = useState<SeekerProfile | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(null));
  const [touched, setTouched] = useState(false);
  const [touchedExp, setTouchedExp] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate client hydration from an existing local profile */
    const p = readProfile();
    setExisting(p);
    if (p) setDraft(initialDraft(p));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const step1Valid =
    draft.fullName.trim().length > 1 &&
    EMAIL_RE.test(draft.email.trim()) &&
    draft.country.length > 0;

  const step3Valid = draft.experienceYears !== "";

  function persist(): SeekerProfile {
    const profile: SeekerProfile = {
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim() || undefined,
      country: draft.country,
      hearAbout: draft.hearAbout || undefined,
      resumeName: draft.resumeName || undefined,
      resumeSize: draft.resumeSize || undefined,
      experienceYears: draft.experienceYears || undefined,
      currentDesignation: draft.currentDesignation.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    writeProfile(profile);
    return profile;
  }

  function next() {
    if (step === 0) {
      // Résumé — optional, nothing to validate.
      setStep(1);
      return;
    }
    if (step === 1) {
      setTouched(true);
      if (!step1Valid) return;
      persist();
      setStep(2);
      return;
    }
    // Step 3 — experience level is required so the board can be tailored.
    setTouchedExp(true);
    if (!step3Valid) return;
    finish();
  }

  function finish() {
    const profile = persist();
    // Read `?next=` at click time — by now the URL is fully settled, which it
    // isn't guaranteed to be during the redirect that lands the user here.
    const target = readNextPath("/app");
    trackEvent({
      name: "onboarding_completed",
      props: {
        next: target,
        hasResume: Boolean(profile.resumeName),
        level: bandToLevel(profile.experienceYears),
      },
    });
    router.push(target);
  }

  const current = STEPS[step];

  return (
    <div className="min-h-[100dvh] bg-bg lg:grid lg:grid-cols-[minmax(0,38%)_1fr]">
      {/* Left — brand / progress */}
      <aside className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:py-12">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-[rgba(216,179,106,0.3)] bg-[var(--gold-dim)] font-display text-[15px] text-gold-soft">
              P
            </span>
            <span className="font-display text-[17px] tracking-tight text-text">
              PM Dream Job
            </span>
          </Link>

          <div className="mt-10 hidden lg:block">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
              <Asterisk className="h-3.5 w-3.5" />
              {existing ? "Welcome back" : "Welcome"}
            </p>
            <h1 className="mt-4 font-display text-[34px] leading-[1.08] tracking-tight text-text">
              {existing ? "Update your profile." : "Let's set up your profile."}
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
              It stays on this device and tailors the board to your level. Takes
              under a minute — only the résumé step is optional.
            </p>
          </div>

          {/* Stepper */}
          <ol className="mt-10 space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    disabled={i > step}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors",
                      i < step && "hover:bg-[var(--bg-elevated)]",
                      i > step && "cursor-default",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[12px] font-semibold transition-colors",
                        done && "border-gold bg-gold text-[#1a1406]",
                        active && "border-gold text-gold",
                        !done && !active && "border-[var(--border-strong)] text-text-faint",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.n}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          active || done ? "text-text" : "text-text-faint",
                        )}
                      >
                        {s.title}
                        {s.optional && (
                          <span className="ml-2 text-[11px] font-normal text-text-faint">
                            optional
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-text-faint">{s.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="hidden text-xs text-text-faint lg:block">
          PM Dream Job · Job-seeker onboarding
        </p>
      </aside>

      {/* Right — form (deliberately light, like a focused document) */}
      <section className="flex flex-col bg-[#f5f3ee] text-[#1b1a17]">
        <div className="flex items-center justify-between px-6 py-5 sm:px-12">
          <span className="text-[13px] text-[#8a857a]">
            No account · stays on this device
          </span>
          <span className="font-mono text-[12px] tracking-wide text-[#8a857a]">
            Step {current.n} of {STEPS.length}
          </span>
        </div>

        <div className="flex flex-1 items-start px-6 pb-12 pt-4 sm:px-12 lg:items-center lg:pt-0">
          <div className="w-full max-w-md">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b8791f]">
              <Asterisk className="h-3.5 w-3.5" />
              {current.title}
            </p>
            <h2 className="mt-3 font-display text-[30px] leading-tight tracking-tight text-[#1b1a17]">
              {step === 0
                ? "Add your résumé"
                : step === 1
                  ? "Tell us who you are"
                  : "A bit about your work"}
            </h2>

            <div className="mt-8">
              {step === 0 && <ResumeStep draft={draft} set={set} />}
              {step === 1 && (
                <BasicStep draft={draft} set={set} showErrors={touched} />
              )}
              {step === 2 && (
                <ExperienceStep draft={draft} set={set} showErrors={touchedExp} />
              )}
            </div>

            <div className="mt-10 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => (step === 0 ? router.push("/") : setStep((s) => s - 1))}
                className="inline-flex items-center gap-1.5 text-sm text-[#6b675e] transition-colors hover:text-[#1b1a17]"
              >
                <ArrowLeft className="h-4 w-4" />
                {step === 0 ? "Home" : "Back"}
              </button>

              <div className="flex items-center gap-4">
                {current.optional && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
                    className="text-sm text-[#6b675e] transition-colors hover:text-[#1b1a17]"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={
                    (step === 1 && touched && !step1Valid) ||
                    (step === 2 && touchedExp && !step3Valid)
                  }
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#c9812a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#b0701f] disabled:opacity-50"
                >
                  {step === STEPS.length - 1 ? "Finish" : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- shared light-panel field primitives ---------- */

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-[#3a372f]">
      {children}
      {required && <span className="ml-0.5 text-[#c9812a]">*</span>}
    </label>
  );
}

const fieldCls =
  "w-full rounded-[10px] border border-[#d8d3c6] bg-white px-3 py-2.5 text-sm text-[#1b1a17] placeholder:text-[#a8a396] focus:border-[#c9812a] focus:outline-none focus:ring-2 focus:ring-[#c9812a]/20";

function IconField({
  icon: Icon,
  children,
}: {
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a396]" />
      {children}
    </div>
  );
}

type StepProps = {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
};

function BasicStep({
  draft,
  set,
  showErrors,
}: StepProps & { showErrors: boolean }) {
  const emailBad = showErrors && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
  const nameBad = showErrors && draft.fullName.trim().length <= 1;
  return (
    <div className="space-y-5">
      <div>
        <Label required>Full name</Label>
        <IconField icon={User}>
          <input
            className={cn(fieldCls, "pl-9", nameBad && "border-red-400")}
            value={draft.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </IconField>
      </div>
      <div>
        <Label required>Email</Label>
        <IconField icon={Mail}>
          <input
            type="email"
            className={cn(fieldCls, "pl-9", emailBad && "border-red-400")}
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </IconField>
        {emailBad && (
          <p className="mt-1 text-xs text-red-500">Enter a valid email address.</p>
        )}
      </div>
      <div>
        <Label>Phone</Label>
        <IconField icon={Phone}>
          <input
            className={cn(fieldCls, "pl-9")}
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
        </IconField>
      </div>
      <div>
        <Label required>Country</Label>
        <IconField icon={Globe}>
          <select
            className={cn(fieldCls, "pl-9 appearance-none")}
            value={draft.country}
            onChange={(e) => set("country", e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </IconField>
        <p className="mt-1 text-xs text-[#8a857a]">
          The board is India-focused today; this helps us as we expand.
        </p>
      </div>
      <div>
        <Label>How did you hear about us?</Label>
        <select
          className={cn(fieldCls, "appearance-none")}
          value={draft.hearAbout}
          onChange={(e) => set("hearAbout", e.target.value)}
        >
          <option value="">Select an option</option>
          {HEAR_ABOUT.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ResumeStep({ draft, set }: StepProps) {
  const has = Boolean(draft.resumeName);
  const [prefilled, setPrefilled] = useState<ResumeGuess | null>(null);

  // Prefill the next two steps from the résumé — only fields still blank, so
  // this never clobbers something the visitor already typed (e.g. re-uploading
  // after editing their name).
  function applyGuesses(text: string) {
    const guess = guessFromResume(text);
    if (guess.email && !draft.email) set("email", guess.email);
    if (guess.phone && !draft.phone) set("phone", guess.phone);
    if (guess.experienceYears && !draft.experienceYears)
      set("experienceYears", guess.experienceYears);
    if (guess.email || guess.phone || guess.experienceYears) setPrefilled(guess);
  }

  function onParsed(parsed: ParsedResume) {
    writeResume(parsed);
    set("resumeName", parsed.fileName ?? "Résumé (pasted)");
    set("resumeSize", parsed.text.length);
    applyGuesses(parsed.text);
  }

  const {
    inputRef,
    busy,
    error,
    setError,
    pasteOpen,
    setPasteOpen,
    pasteText,
    setPasteText,
    handleFile: onFile,
    handlePaste: savePaste,
    ACCEPTED,
  } = useResumeUpload(onParsed);

  function remove() {
    clearResume();
    set("resumeName", "");
    set("resumeSize", 0);
    setPrefilled(null);
  }

  return (
    <div>
      {has ? (
        <>
          <div className="flex items-center gap-3 rounded-[12px] border border-[#d8d3c6] bg-white p-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f0ede4] text-[#c9812a]">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#1b1a17]">
                {draft.resumeName}
              </p>
              <p className="text-xs text-[#8a857a]">
                {draft.resumeSize.toLocaleString()} characters · match scoring on
                · this device only
              </p>
            </div>
            <button
              type="button"
              onClick={remove}
              className="rounded p-1 text-[#8a857a] hover:text-[#1b1a17]"
              aria-label="Remove résumé"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {prefilled && (
            <p className="mt-3 text-xs leading-relaxed text-[#8a857a]">
              We picked up your{" "}
              {[
                prefilled.email && "email",
                prefilled.phone && "phone",
                prefilled.experienceYears && "experience level",
              ]
                .filter(Boolean)
                .join(", ")}{" "}
              from it — check the next steps and fix anything that&apos;s off.
            </p>
          )}
        </>
      ) : pasteOpen ? (
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder="Paste your résumé text here…"
            className={cn(fieldCls, "resize-y")}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={savePaste}
              className="inline-flex h-9 items-center rounded-[10px] bg-[#c9812a] px-4 text-[13px] font-semibold text-white hover:bg-[#b0701f]"
            >
              Use this text
            </button>
            <button
              type="button"
              onClick={() => {
                setPasteOpen(false);
                setError(null);
              }}
              className="text-[13px] text-[#6b675e] hover:text-[#1b1a17]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center rounded-[14px] border border-dashed border-[#cfc9ba] bg-white/60 px-6 py-12 text-center transition-colors hover:border-[#c9812a] hover:bg-white disabled:opacity-60"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5e6d3] text-[#c9812a]">
              <UploadCloud className="h-5 w-5" />
            </span>
            <span className="mt-4 text-sm font-medium text-[#1b1a17]">
              {busy ? "Reading your résumé…" : "Click to upload your résumé"}
            </span>
            <span className="mt-1 font-mono text-[12px] text-[#8a857a]">
              PDF, DOCX or TXT · up to 8 MB
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPasteOpen(true);
              setError(null);
            }}
            className="mt-2 text-[13px] text-[#6b675e] hover:text-[#1b1a17]"
          >
            or paste the text instead
          </button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <p className="mt-4 text-xs leading-relaxed text-[#8a857a]">
        Parsed in your browser and kept on this device — the file is never
        uploaded. Used to match you against each role. Sign in later to sync it
        across devices.
      </p>
    </div>
  );
}

function ExperienceStep({
  draft,
  set,
  showErrors,
}: StepProps & { showErrors: boolean }) {
  const expBad = showErrors && draft.experienceYears === "";
  return (
    <div className="space-y-5">
      <div>
        <Label required>Years of experience</Label>
        <select
          className={cn(fieldCls, "appearance-none", expBad && "border-red-400")}
          value={draft.experienceYears}
          onChange={(e) => set("experienceYears", e.target.value as ExperienceBand)}
        >
          <option value="">Select experience</option>
          {EXPERIENCE_BANDS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        {expBad ? (
          <p className="mt-1 text-xs text-red-500">
            Pick a range so we can tailor the board to your level.
          </p>
        ) : (
          <p className="mt-1 text-xs text-[#8a857a]">
            We&apos;ll pre-select a matching level on the jobs page.
          </p>
        )}
      </div>
      <div>
        <Label>Current designation</Label>
        <IconField icon={Briefcase}>
          <input
            className={cn(fieldCls, "pl-9")}
            value={draft.currentDesignation}
            onChange={(e) => set("currentDesignation", e.target.value)}
            placeholder="e.g. Senior Product Manager"
          />
        </IconField>
      </div>
    </div>
  );
}
