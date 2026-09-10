"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import questionsData from "@/data/questions.json";

type Question = {
  id: string;
  category: string;
  q: string;
  approach: string;
  tags: string[];
};

const DATA = questionsData as { categories: string[]; questions: Question[] };

export function QuestionBank() {
  const [category, setCategory] = React.useState<string>("All");
  const [open, setOpen] = React.useState<Set<string>>(new Set());

  const filtered =
    category === "All"
      ? DATA.questions
      : DATA.questions.filter((q) => q.category === category);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-8">
      <header>
        <h1 className="font-display text-2xl tracking-tight text-text">
          Question Bank
        </h1>
        <p className="mt-1 max-w-xl text-sm text-text-muted">
          {DATA.questions.length} common PM interview questions with a structured
          way to approach each one. Practise out loud, then read the approach.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        {["All", ...DATA.categories].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
              category === c
                ? "border-[rgba(216,179,106,0.45)] bg-[var(--gold-dim)] text-gold-soft"
                : "border-[var(--border-strong)] text-text-muted hover:text-text",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-2.5">
        {filtered.map((q) => {
          const isOpen = open.has(q.id);
          return (
            <li
              key={q.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <button
                onClick={() => toggle(q.id)}
                className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left"
              >
                <span>
                  <span className="block text-[13px] text-text">{q.q}</span>
                  <span className="mt-1 block text-[11px] uppercase tracking-wide text-text-faint">
                    {q.category}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-text-faint transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-t border-[var(--border)] px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    How to approach it
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {q.approach}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {q.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-text-faint"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
