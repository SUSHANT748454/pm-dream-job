"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Check, Clock, Sparkles, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { usePracticeHistory, type RatingSet } from "@/lib/practice";
import { AiInterviewSession } from "@/components/app/ai-interview-session";
import questionsData from "@/data/questions.json";

type Question = { id: string; category: string; q: string; approach: string; tags: string[] };
const DATA = questionsData as { categories: string[]; questions: Question[] };

const RUBRIC: { key: keyof RatingSet; label: string; hint: string }[] = [
  { key: "structure", label: "Structure", hint: "Clear frame, logical flow" },
  { key: "tradeoffs", label: "Prioritisation", hint: "Picked one thing, justified it" },
  { key: "metrics", label: "Metrics", hint: "Named a concrete success measure" },
  { key: "empathy", label: "User empathy", hint: "Grounded in a real user or segment" },
  { key: "communication", label: "Communication", hint: "Concise, confident, no rambling" },
];

const EMPTY_RATINGS: RatingSet = {
  structure: 0,
  tradeoffs: 0,
  metrics: 0,
  empathy: 0,
  communication: 0,
};

function pickQuestion(category: string, avoidId?: string): Question {
  const pool = category === "Any" ? DATA.questions : DATA.questions.filter((q) => q.category === category);
  const candidates = pool.length > 1 ? pool.filter((q) => q.id !== avoidId) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Timed round against a real question, then a rubric across the same 5
 * dimensions interviewers actually use — scored by the visitor (free, no
 * account) or, via the mode toggle, by the AI interviewer (signed-in,
 * capped, see ai-interview-session.tsx).
 */
export function PracticeSession() {
  const { records, hydrated, add } = usePracticeHistory();
  const [mode, setMode] = React.useState<"self" | "ai">("self");
  const [category, setCategory] = React.useState("Any");
  const [phase, setPhase] = React.useState<"setup" | "practicing" | "reviewing">("setup");
  const [question, setQuestion] = React.useState<Question | null>(null);
  const [seconds, setSeconds] = React.useState(0);
  const [ratings, setRatings] = React.useState<RatingSet>(EMPTY_RATINGS);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Arriving from a "Practice this live" link in the Question Bank —
  // preselect its category, once, the same way the dashboard reads its
  // ?job= param: after mount, so server and first client render still agree.
  const categoryFromUrlRef = React.useRef(false);
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate: reads the ?category= the visitor arrived with, once */
    if (categoryFromUrlRef.current) return;
    categoryFromUrlRef.current = true;
    try {
      const c = new URLSearchParams(window.location.search).get("category");
      if (c && DATA.categories.includes(c)) setCategory(c);
    } catch {
      /* ignore */
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function start(fromId?: string) {
    const q = pickQuestion(category, fromId);
    setQuestion(q);
    setSeconds(0);
    setRatings(EMPTY_RATINGS);
    setPhase("practicing");
    trackEvent({ name: "practice_started", props: { category } });
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function revealApproach() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("reviewing");
  }

  function saveAndNext() {
    if (!question) return;
    const sum = Object.values(ratings).reduce((a, b) => a + b, 0);
    const overall = Math.round((sum / 5) * 10) / 10;
    add({
      questionId: question.id,
      category: question.category,
      q: question.q,
      durationSec: seconds,
      ratings,
      overall,
    });
    trackEvent({ name: "practice_completed", props: { category: question.category, overall } });
    start(question.id);
  }

  function endSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("setup");
    setQuestion(null);
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const sessionCount = hydrated ? records.length : 0;
  const sessionAvg =
    hydrated && records.length > 0
      ? (records.reduce((a, r) => a + r.overall, 0) / records.length).toFixed(1)
      : null;

  if (phase === "setup" || !question) {
    if (mode === "ai") {
      return <AiInterviewSession onSwitchToSelf={() => setMode("self")} />;
    }
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="mb-5 inline-flex rounded-lg border border-[var(--border-strong)] p-0.5 text-[12px]">
          <button
            onClick={() => setMode("self")}
            className="rounded-md bg-[var(--bg-elevated)] px-3 py-1.5 text-text"
          >
            Self-practice
          </button>
          <button
            onClick={() => setMode("ai")}
            className="rounded-md px-3 py-1.5 text-text-muted hover:text-text"
          >
            AI interviewer
          </button>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-lg text-text">Practise a round</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Pick a category, answer out loud against the clock like a real
          interview, then score yourself against the approach — structure,
          trade-offs, metrics, empathy, and communication.
        </p>
        <div className="mt-5">
          <label className="mb-1.5 block text-[13px] font-medium text-text">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full appearance-none rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-text focus:outline-none"
          >
            <option>Any</option>
            {DATA.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={() => start()}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft"
          >
            <Play className="h-4 w-4" /> Start practising
          </button>
          <Link
            href="/app/questions"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
          >
            <BookOpen className="h-3.5 w-3.5" /> Browse the Question Bank
          </Link>
        </div>
        {sessionAvg && (
          <p className="mt-4 text-xs text-text-faint">
            {sessionCount} question{sessionCount === 1 ? "" : "s"} practised so
            far · avg self-score {sessionAvg}/5
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[11px] uppercase tracking-wide text-text-faint">
          {question.category}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-sm text-text-muted">
          <Clock className="h-3.5 w-3.5" /> {mmss}
        </span>
      </div>

      <p className="mt-4 font-display text-xl leading-snug text-text">
        {question.q}
      </p>

      {phase === "practicing" && (
        <>
          <p className="mt-3 text-sm text-text-muted">
            Answer out loud as if this were a real interview. When you&apos;re
            done, reveal the approach and score yourself.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={revealApproach}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft"
            >
              <Check className="h-4 w-4" /> I&apos;m done — reveal approach
            </button>
            <button
              onClick={endSession}
              className="text-sm text-text-muted hover:text-text"
            >
              End session
            </button>
          </div>
        </>
      )}

      {phase === "reviewing" && (
        <>
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
              How to approach it
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {question.approach}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-medium text-text">
              Score yourself, honestly
            </p>
            <div className="mt-3 space-y-3">
              {RUBRIC.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] text-text">{r.label}</p>
                    <p className="text-[11px] text-text-faint">{r.hint}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setRatings((prev) => ({ ...prev, [r.key]: n }))}
                        aria-label={`${r.label}: ${n}`}
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-full border text-[12px] transition-colors",
                          ratings[r.key] >= n
                            ? "border-gold bg-gold text-[#1a1406]"
                            : "border-[var(--border-strong)] text-text-faint hover:text-text",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={saveAndNext}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft"
            >
              Save &amp; next question
            </button>
            <button
              onClick={endSession}
              className="text-sm text-text-muted hover:text-text"
            >
              End session
            </button>
          </div>
        </>
      )}
    </div>
  );
}
