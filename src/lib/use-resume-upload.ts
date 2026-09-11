"use client";

import * as React from "react";

import { parseResumeFile, ResumeParseError, ACCEPTED } from "@/lib/resume-parse";
import { trackEvent } from "@/lib/analytics";
import type { ResumeSource } from "@/lib/resume";

export type ParsedResume = { text: string; fileName?: string; source: ResumeSource };

/**
 * Shared upload/paste/parse behavior for the two résumé-capture surfaces —
 * the dark ResumePrompt card used across the app, and the light onboarding
 * wizard step. They stay visually distinct on purpose (different context),
 * but share this so error copy, size limits, and parsing never drift apart.
 */
export function useResumeUpload(onParsed: (parsed: ParsedResume) => void) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { text, source } = await parseResumeFile(file);
      onParsed({ text, fileName: file.name, source });
      trackEvent({ name: "resume_parsed", props: { type: source, ok: true } });
    } catch (e) {
      setError(
        e instanceof ResumeParseError
          ? e.message
          : "Couldn't read that file. Try a PDF, .docx, or paste the text.",
      );
      trackEvent({ name: "resume_parsed", props: { type: "file", ok: false } });
    } finally {
      setBusy(false);
    }
  }

  function handlePaste() {
    const text = pasteText.trim();
    if (text.length < 80) {
      setError("That looks too short — paste the full résumé text.");
      return;
    }
    onParsed({ text, source: "paste" });
    trackEvent({ name: "resume_parsed", props: { type: "paste", ok: true } });
    setPasteOpen(false);
    setPasteText("");
  }

  return {
    inputRef,
    busy,
    error,
    setError,
    pasteOpen,
    setPasteOpen,
    pasteText,
    setPasteText,
    handleFile,
    handlePaste,
    ACCEPTED,
  };
}
