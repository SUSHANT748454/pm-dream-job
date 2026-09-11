"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, Send, Lock, AlertTriangle, Loader2, ArrowLeft, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { fetchTodayInterviewUsage, DAILY_AI_INTERVIEW_LIMIT } from "@/lib/interview-usage";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import questionsData from "@/data/questions.json";

type Question = { id: string; category: string; q: string; approach: string; tags: string[] };
const DATA = questionsData as { categories: string[]; questions: Question[] };

type Ratings = {
  structure: number;
  tradeoffs: number;
  metrics: number;
  empathy: number;
  communication: number;
};

const RUBRIC_LABELS: { key: keyof Ratings; label: string }[] = [
  { key: "structure", label: "Structure" },
  { key: "tradeoffs", label: "Prioritisation" },
  { key: "metrics", label: "Metrics" },
  { key: "empathy", label: "User empathy" },
  { key: "communication", label: "Communication" },
];

type HistoryTurn = { role: "user" | "assistant"; content: string };
type Phase = "setup" | "opening" | "waiting" | "followup" | "feedback";

function pickQuestion(category: string): Question {
  const pool =
    category === "Any" ? DATA.questions : DATA.questions.filter((q) => q.category === category);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function callInterviewApi(payload: {
  question: Question;
  history: HistoryTurn[];
  turn: 1 | 2;
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Not configured." };
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { ok: false, error: "Sign in to use the AI interviewer." };

  const res = await fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return { ok: false, error: (json.error as string) ?? "Something went wrong." };
  return { ok: true, data: json };
}

/**
 * The LLM-backed mode, layered on top of the free self-practice mode — never
 * a replacement for it. Exactly 2 model calls per round: one follow-up
 * question, one feedback turn. Server-gated (sign-in + a daily cap) at
 * /api/interview; this component just drives the conversation and renders
 * whatever the endpoint returns.
 */
export function AiInterviewSession({ onSwitchToSelf }: { onSwitchToSelf: () => void }) {
  const { ready, user } = useAuth();
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [usage, setUsage] = React.useState<number | null>(null);

  const [category, setCategory] = React.useState("Any");
  const [phase, setPhase] = React.useState<Phase>("setup");
  const [question, setQuestion] = React.useState<Question | null>(null);
  const [history, setHistory] = React.useState<HistoryTurn[]>([]);
  const [answer, setAnswer] = React.useState("");
  const [followupText, setFollowupText] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ ratings: Ratings | null; summary: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate: reset/refresh usage as auth or phase changes */
    if (!user) {
      setUsage(null);
      return;
    }
    let active = true;
    fetchTodayInterviewUsage(user.id).then((n) => {
      if (active) setUsage(n);
    });
    return () => {
      active = false;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user, phase]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
          <Lock className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-lg text-text">AI interviewer — sign-in required</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          This mode calls a real model per round, so it&apos;s capped at{" "}
          {DAILY_AI_INTERVIEW_LIMIT} sessions/day per account. Self-practice mode
          right next to it has no limit and needs no account.
        </p>
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={() => setSignInOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft"
          >
            Sign in to try it
          </button>
          <button onClick={onSwitchToSelf} className="text-sm text-text-muted hover:text-text">
            Back to self-practice
          </button>
        </div>
        <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      </div>
    );
  }

  async function start() {
    setError(null);
    const q = pickQuestion(category);
    setQuestion(q);
    setHistory([]);
    setAnswer("");
    setPhase("opening");
    trackEvent({ name: "ai_interview_started", props: { category } });
  }

  async function submitOpening() {
    if (!question || !answer.trim()) return;
    const newHistory: HistoryTurn[] = [{ role: "user", content: answer.trim() }];
    setHistory(newHistory);
    setPhase("waiting");
    setError(null);
    const result = await callInterviewApi({ question, history: newHistory, turn: 1 });
    if (!result.ok) {
      setError(result.error);
      setPhase("opening");
      return;
    }
    const text = (result.data.text as string) ?? "";
    setFollowupText(text);
    setHistory([...newHistory, { role: "assistant", content: text }]);
    setAnswer("");
    setPhase("followup");
  }

  async function submitFollowup() {
    if (!question || !answer.trim()) return;
    const newHistory: HistoryTurn[] = [...history, { role: "user", content: answer.trim() }];
    setHistory(newHistory);
    setPhase("waiting");
    setError(null);
    const result = await callInterviewApi({ question, history: newHistory, turn: 2 });
    if (!result.ok) {
      setError(result.error);
      setPhase("followup");
      return;
    }
    setFeedback({
      ratings: (result.data.ratings as Ratings | null) ?? null,
      summary: (result.data.summary as string) ?? "",
    });
    trackEvent({ name: "ai_interview_completed", props: { category } });
    setPhase("feedback");
  }

  if (phase === "setup") {
    const atLimit = usage != null && usage >= DAILY_AI_INTERVIEW_LIMIT;
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-dim)] text-gold-soft">
          <Bot className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-lg text-text">AI interviewer</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          A real back-and-forth: answer the question, get one sharp follow-up,
          then structured feedback — same 5 dimensions as self-practice, scored
          by the model instead of by you.
        </p>
        <div className="mt-5">
          <label className="mb-1.5 block text-[13px] font-medium text-text">Category</label>
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

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={start}
            disabled={atLimit}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-50"
          >
            <Bot className="h-4 w-4" /> Start AI interview
          </button>
          <button onClick={onSwitchToSelf} className="text-sm text-text-muted hover:text-text">
            Back to self-practice
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-text-faint">
            {usage == null ? "…" : `${usage} of ${DAILY_AI_INTERVIEW_LIMIT} AI sessions used today`}
            {atLimit && " — self-practice mode has no daily limit."}
          </p>
          <Link
            href="/app/questions"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs text-text-muted hover:text-text"
          >
            <BookOpen className="h-3.5 w-3.5" /> Question Bank
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={onSwitchToSelf}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-text-faint hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Exit AI interview
      </button>

      <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[11px] uppercase tracking-wide text-text-faint">
        {question?.category}
      </span>

      {(phase === "opening" || phase === "waiting") && question && (
        <>
          <p className="mt-4 font-display text-xl leading-snug text-text">{question.q}</p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={phase === "waiting"}
            rows={5}
            placeholder="Type what you'd say out loud…"
            className="mt-4 w-full resize-y rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none disabled:opacity-60"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            onClick={submitOpening}
            disabled={phase === "waiting" || !answer.trim()}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-50"
          >
            {phase === "waiting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking of a follow-up…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Answer
              </>
            )}
          </button>
        </>
      )}

      {(phase === "followup" || (phase === "waiting" && history.length >= 2)) && (
        <>
          <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm leading-relaxed text-text">
            {followupText}
          </p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={phase === "waiting"}
            rows={5}
            placeholder="Type your follow-up answer…"
            className="mt-4 w-full resize-y rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none disabled:opacity-60"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            onClick={submitFollowup}
            disabled={phase === "waiting" || !answer.trim()}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-50"
          >
            {phase === "waiting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Scoring your answers…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Answer
              </>
            )}
          </button>
        </>
      )}

      {phase === "feedback" && feedback && (
        <>
          <p className="mt-5 text-sm leading-relaxed text-text-muted">{feedback.summary}</p>
          {feedback.ratings && (
            <div className="mt-4 space-y-2.5">
              {RUBRIC_LABELS.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-text">{r.label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={cn(
                          "h-2 w-5 rounded-full",
                          feedback.ratings![r.key] >= n ? "bg-gold" : "bg-[var(--border-strong)]",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={start}
              disabled={usage != null && usage >= DAILY_AI_INTERVIEW_LIMIT}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-gold px-5 text-sm font-semibold text-[#1a1406] hover:bg-gold-soft disabled:opacity-50"
            >
              Practise another
            </button>
            <button onClick={onSwitchToSelf} className="text-sm text-text-muted hover:text-text">
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
