"use client";

import type { ResumeSource } from "@/lib/resume";

/**
 * Client-only résumé text extraction. Heavy parsers (pdf.js, mammoth) are
 * dynamically imported so they're only fetched when someone actually uploads
 * that file type — they never touch the initial bundle. Nothing leaves the
 * browser.
 */

export const ACCEPTED = ".pdf,.doc,.docx,.txt,.md,.rtf";
export const MAX_BYTES = 8 * 1024 * 1024;

export class ResumeParseError extends Error {}

export interface ParsedResume {
  text: string;
  source: ResumeSource;
}

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  if (file.size > MAX_BYTES) {
    throw new ResumeParseError("That file is over 8 MB — please pick a smaller one.");
  }
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return { text: normalise(await parsePdf(file)), source: "pdf" };
  }
  if (name.endsWith(".docx")) {
    return { text: normalise(await parseDocx(file)), source: "docx" };
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf")) {
    return { text: normalise(stripRtf(await file.text())), source: "txt" };
  }
  if (name.endsWith(".doc")) {
    throw new ResumeParseError(
      "Old .doc files can't be read here — save it as PDF or .docx, or paste the text.",
    );
  }
  // Unknown extension: try as plain text.
  const text = normalise(await file.text());
  if (!/[a-z]{40}/i.test(text.replace(/\s/g, ""))) {
    throw new ResumeParseError(
      "Couldn't read that file — try a PDF, .docx, or paste the text instead.",
    );
  }
  return { text, source: "txt" };
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Bundled worker — the bundler emits it and rewrites this URL to a
  // same-origin asset. Nothing is fetched from a CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" "),
    );
  }
  await doc.destroy();
  const text = pages.join("\n");
  if (text.replace(/\s/g, "").length < 30) {
    throw new ResumeParseError(
      "This PDF looks scanned (no selectable text). Paste your résumé text instead.",
    );
  }
  return text;
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value;
}

function stripRtf(s: string): string {
  if (!s.startsWith("{\\rtf")) return s;
  return s
    .replace(/\\'[0-9a-f]{2}/gi, " ")
    .replace(/\\[a-z]+-?\d* ?/gi, " ")
    .replace(/[{}]/g, " ");
}

function normalise(s: string): string {
  return s
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
