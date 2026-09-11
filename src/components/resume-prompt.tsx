"use client";

import { FileText, UploadCloud, Loader2, X, Check } from "lucide-react";

import { useResume } from "@/lib/resume";
import { useResumeUpload, type ParsedResume } from "@/lib/use-resume-upload";
import { cn } from "@/lib/utils";

/**
 * Dark-theme résumé capture used on the board + dashboard. Upload a PDF/DOCX/TXT
 * (parsed in the browser) or paste the text. Feeds the on-device ATS match.
 */
export function ResumePrompt({
  title = "Add your résumé to see match scores",
  blurb = "Parsed in your browser and kept on this device — the file is never uploaded. Powers an on-device keyword match against each role.",
  className,
  onDone,
}: {
  title?: string;
  blurb?: string;
  className?: string;
  onDone?: () => void;
}) {
  const { resume, hydrated, save, clear } = useResume();

  function onParsed(parsed: ParsedResume) {
    save(parsed);
    onDone?.();
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
    handleFile,
    handlePaste,
    ACCEPTED,
  } = useResumeUpload(onParsed);

  if (!hydrated) return <div className={cn("h-px", className)} />;

  if (resume) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3",
          className,
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--gold-dim)] text-gold-soft">
          <Check className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 text-[13px]">
          <p className="truncate text-text">
            {resume.fileName ?? "Résumé text"} · match scoring on
          </p>
          <p className="text-text-faint">
            {resume.chars.toLocaleString()} characters · on this device only
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="shrink-0 text-[13px] text-text-muted hover:text-text"
        >
          Replace
        </button>
        <button
          onClick={clear}
          aria-label="Remove résumé"
          className="shrink-0 rounded p-1 text-text-faint hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[17px] text-text">{title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-text-muted">{blurb}</p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </p>
      )}

      {pasteOpen ? (
        <div className="mt-4">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={7}
            placeholder="Paste your résumé text here…"
            className="w-full resize-y rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={handlePaste}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] bg-gold px-4 text-[13px] font-semibold text-[#1a1406] hover:bg-gold-soft"
            >
              Use this text
            </button>
            <button
              onClick={() => {
                setPasteOpen(false);
                setError(null);
              }}
              className="text-[13px] text-text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-4 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Reading…
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" /> Upload résumé
              </>
            )}
          </button>
          <button
            onClick={() => {
              setPasteOpen(true);
              setError(null);
            }}
            className="text-[13px] text-text-muted hover:text-text"
          >
            or paste the text
          </button>
          <span className="font-mono text-[11px] text-text-faint">
            PDF, DOCX, TXT · up to 8 MB
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
