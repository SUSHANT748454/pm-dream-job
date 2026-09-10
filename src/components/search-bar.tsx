"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export function SearchBar({
  value,
  onChange,
  resultCountHint,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  resultCountHint?: number;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const [lastProp, setLastProp] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the input when `value` changes from outside (chips, clear-all) — the
  // render-phase "adjust state on prop change" pattern, not an effect.
  if (value !== lastProp) {
    setLastProp(value);
    setLocal(value);
  }

  function commit(next: string) {
    onChange(next);
    if (next.trim()) {
      trackEvent({
        name: "job_searched",
        props: { query: next.trim(), results: resultCountHint ?? -1 },
      });
    }
  }

  function handle(next: string) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 300);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-3 focus-within:border-[rgba(216,179,106,0.45)]",
        className,
      )}
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-text-faint" />
      <input
        type="search"
        value={local}
        onChange={(e) => handle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (timer.current) clearTimeout(timer.current);
            commit(local);
          }
        }}
        placeholder="Search role, company, skill or city — e.g. “Senior PM fintech Bengaluru”"
        aria-label="Search product management jobs"
        className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setLocal("");
            if (timer.current) clearTimeout(timer.current);
            commit("");
          }}
          className="shrink-0 rounded p-1 text-text-faint hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
