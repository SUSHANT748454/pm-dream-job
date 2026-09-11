import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

/**
 * AI-backed mock interview — the one server endpoint in this app that calls a
 * paid API. Everything else here is static or talks to Supabase directly; this
 * route exists because an LLM key can never be exposed to the browser.
 *
 * Bounded by design: exactly 2 model calls per session (one follow-up
 * question, one feedback turn), gated behind sign-in, and capped at
 * DAILY_LIMIT sessions/user/day — enforced server-side on every call (not
 * just the one that starts a session) so the cap can't be bypassed by a
 * client that calls turn 2 directly. Request fields are also length-checked,
 * since the client fully controls this payload and there's no other limit
 * on tokens billed per call. Skips cleanly (503) if ANTHROPIC_API_KEY isn't
 * configured, matching every other optional integration in this app.
 */

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5";
const DAILY_LIMIT = 3;
// Every real session is exactly 2 calls (opening + feedback). This is the
// actual cost ceiling — enforced on every call, not just turn 1 — so a
// client that skips turn 1 and calls turn 2 directly in a loop can't get
// unlimited free model calls out of the daily-session gate below.
const MAX_CALLS_PER_DAY = DAILY_LIMIT * 2;

// A legitimate round never has more than [user, assistant, user] in history,
// and no field here needs to be more than a paragraph — these caps stop a
// forged request from ballooning input-token cost past what the UI ever
// sends, since the client fully controls this payload.
const MAX_HISTORY_LEN = 6;
const MAX_CONTENT_LEN = 4000;
const MAX_Q_LEN = 400;
const MAX_CATEGORY_LEN = 60;
const MAX_APPROACH_LEN = 1000;

interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  question: { q: string; category: string; approach: string };
  history: HistoryTurn[];
  turn: 1 | 2;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authenticatedUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  return data.user.id;
}

function isBoundedString(v: unknown, maxLen: number): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= maxLen;
}

function isRequestBody(v: unknown): v is RequestBody {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  if (b.turn !== 1 && b.turn !== 2) return false;

  const q = b.question as Record<string, unknown> | null;
  if (
    !q ||
    typeof q !== "object" ||
    !isBoundedString(q.q, MAX_Q_LEN) ||
    !isBoundedString(q.category, MAX_CATEGORY_LEN) ||
    !isBoundedString(q.approach, MAX_APPROACH_LEN)
  ) {
    return false;
  }

  if (!Array.isArray(b.history) || b.history.length === 0 || b.history.length > MAX_HISTORY_LEN) {
    return false;
  }
  return b.history.every(
    (h) =>
      h &&
      typeof h === "object" &&
      ((h as Record<string, unknown>).role === "user" ||
        (h as Record<string, unknown>).role === "assistant") &&
      isBoundedString((h as Record<string, unknown>).content, MAX_CONTENT_LEN),
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI interviewer isn't set up on this deployment yet." },
      { status: 503 },
    );
  }

  const userId = await authenticatedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to use the AI interviewer." },
      { status: 401 },
    );
  }

  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { error: "The AI interviewer isn't set up on this deployment yet." },
      { status: 503 },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  if (!isRequestBody(body)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const { question, history, turn } = body;

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await sb
    .from("interview_usage")
    .select("count, calls")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();
  const used = (existing?.count as number | undefined) ?? 0;
  const calls = (existing?.calls as number | undefined) ?? 0;

  if (turn === 1 && used >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `You've used today's ${DAILY_LIMIT} AI interview sessions. Self-practice mode has no limit — or come back tomorrow.`,
      },
      { status: 429 },
    );
  }
  // Enforced on BOTH turns, not just turn 1: without this, a client that
  // calls turn 2 directly (skipping turn 1 — and its usage check — entirely)
  // could make unlimited model calls against this key. This is the real
  // spend ceiling; the check above is only the user-facing "sessions" one.
  if (calls >= MAX_CALLS_PER_DAY) {
    return NextResponse.json(
      {
        error: `You've used today's ${DAILY_LIMIT} AI interview sessions. Self-practice mode has no limit — or come back tomorrow.`,
      },
      { status: 429 },
    );
  }

  const system =
    turn === 1
      ? `You are a friendly but rigorous Product Manager interviewer conducting a mock interview round. The candidate was asked: "${question.q}" (category: ${question.category}). They just gave their answer. Ask exactly ONE sharp, natural follow-up question that probes a real gap — a missing trade-off, an unstated success metric, or an unexamined assumption. One or two sentences. No preamble, no "great answer" filler, no restating their answer — just the question, like a real interviewer would ask it.`
      : `You are a Product Manager interviewer wrapping up a mock interview round. The candidate was asked "${question.q}", answered, got one follow-up, and has now answered that too. Reference approach for your own grading — don't quote it back to them: ${question.approach}

Score the candidate 1-5 on each of: structure, tradeoffs, metrics, empathy, communication. Then write a 1-2 sentence overall summary that's direct and specific to what they actually said — not generic encouragement.

Respond with ONLY a JSON object, nothing else, no markdown code fences, in exactly this shape:
{"ratings":{"structure":N,"tradeoffs":N,"metrics":N,"empathy":N,"communication":N},"summary":"..."}`;

  const client = new Anthropic({ apiKey });
  let text: string;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: turn === 1 ? 200 : 500,
      system,
      messages: history.map((h) => ({ role: h.role, content: h.content })),
    });
    const block = response.content.find((b) => b.type === "text");
    text = block && "text" in block ? block.text : "";
  } catch (err) {
    console.error("interview route: Anthropic call failed", err);
    return NextResponse.json(
      { error: "The interviewer is unavailable right now — try again shortly." },
      { status: 502 },
    );
  }

  // `count` (sessions, shown to the user) only advances on turn 1; `calls`
  // (raw model calls, the actual cost ceiling) advances on every call.
  await sb.from("interview_usage").upsert(
    {
      user_id: userId,
      day: today,
      count: used + (turn === 1 ? 1 : 0),
      calls: calls + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day" },
  );

  if (turn === 1) {
    return NextResponse.json({ type: "followup", text });
  }

  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      ratings: Record<string, number>;
      summary: string;
    };
    return NextResponse.json({ type: "feedback", ratings: parsed.ratings, summary: parsed.summary });
  } catch {
    // Model didn't return clean JSON — still show something useful rather than fail the round.
    return NextResponse.json({ type: "feedback", ratings: null, summary: text });
  }
}
