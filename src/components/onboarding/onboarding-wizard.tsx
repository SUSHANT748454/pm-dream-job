"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
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
  readProfile,
  writeProfile,
  type ExperienceBand,
  type SeekerProfile,
} from "@/lib/profile";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "basic", n: 1, title: "Basic details", sub: "Name, email, and country", optional: false },
  { id: "resume", n: 2, title: "Your résumé", sub: "Kept on this device", optional: true },
  { id: "experience", n: 3, title: "Your experience", sub: "Level and current role", optional: true },
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

function initialDraft(): Draft {
  const p = readProfile();
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
  const existing = useMemo(() => readProfile(), []);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const step1Valid =
    draft.fullName.trim().length > 1 &&
    EMAIL_RE.test(draft.email.trim()) &&
    draft.country.length > 0;

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
      setTouched(true);
      if (!step1Valid) return;
      persist();
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    finish();
  }

  function finish() {
    persist();
    trackEvent({
      name: "page_viewed",
      props: { path: "/welcome#done" },
    });
    router.push("/jobs?onboarded=1");
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
              under a minute — every step after the first is optional.
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
          <Link
            href="/jobs"
            className="text-[13px] text-[#6b675e] transition-colors hover:text-[#1b1a17]"
          >
            Skip for now
          </Link>
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
                ? "Tell us who you are"
                : step === 1
                  ? "Add your résumé"
                  : "A bit about your work"}
            </h2>

            <div className="mt-8">
              {step === 0 && (
                <BasicStep draft={draft} set={set} showErrors={touched} />
              )}
              {step === 1 && <ResumeStep draft={draft} set={set} />}
              {step === 2 && <ExperienceStep draft={draft} set={set} />}
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
                    onClick={() => (step < STEPS.length - 1 ? setStep((s) => s + 1) : finish())}
                    className="text-sm text-[#6b675e] transition-colors hover:text-[#1b1a17]"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={step === 0 && touched && !step1Valid}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const has = Boolean(draft.resumeName);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose a file under 5 MB.");
      return;
    }
    set("resumeName", file.name);
    set("resumeSize", file.size);
  }

  return (
    <div>
      {has ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-[#d8d3c6] bg-white p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f0ede4] text-[#c9812a]">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1b1a17]">
              {draft.resumeName}
            </p>
            {draft.resumeSize > 0 && (
              <p className="text-xs text-[#8a857a]">
                {(draft.resumeSize / 1024).toFixed(0)} KB · saved on this device
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              set("resumeName", "");
              set("resumeSize", 0);
            }}
            className="rounded p-1 text-[#8a857a] hover:text-[#1b1a17]"
            aria-label="Remove résumé"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center rounded-[14px] border border-dashed border-[#cfc9ba] bg-white/60 px-6 py-12 text-center transition-colors hover:border-[#c9812a] hover:bg-white"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5e6d3] text-[#c9812a]">
            <UploadCloud className="h-5 w-5" />
          </span>
          <span className="mt-4 text-sm font-medium text-[#1b1a17]">
            Click to upload your résumé
          </span>
          <span className="mt-1 font-mono text-[12px] text-[#8a857a]">
            PDF, DOC or DOCX · up to 5MB
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <p className="mt-4 text-xs leading-relaxed text-[#8a857a]">
        Stored only in this browser for now. Résumé autofill and one-click apply
        arrive with accounts.
      </p>
    </div>
  );
}

function ExperienceStep({ draft, set }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Years of experience</Label>
        <select
          className={cn(fieldCls, "appearance-none")}
          value={draft.experienceYears}
          onChange={(e) => set("experienceYears", e.target.value as ExperienceBand)}
        >
          <option value="">Select experience</option>
          {EXPERIENCE_BANDS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[#8a857a]">
          We&apos;ll pre-select a matching level on the jobs page.
        </p>
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
