"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export function SearchBar({
  resultCountHint,
  className,
}: {
  resultCountHint?: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [value, setValue] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef(params.get("q") ?? "");

  // keep in sync if the URL changes elsewhere (e.g. "clear filters")
  useEffect(() => {
    const urlQ = params.get("q") ?? "";
    if (urlQ !== lastPushed.current) {
      lastPushed.current = urlQ;
      setValue(urlQ);
    }
  }, [params]);

  function push(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set("q", next.trim());
    else sp.delete("q");
    sp.delete("page");
    lastPushed.current = next.trim();
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
    if (next.trim()) {
      trackEvent({
        name: "job_searched",
        props: { query: next.trim(), results: resultCountHint ?? -1 },
      });
    }
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 350);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-3 focus-within:border-[rgba(216,179,106,0.45)]",
        className,
      )}
    >
      <Search
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          pending ? "text-gold" : "text-text-faint",
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (timer.current) clearTimeout(timer.current);
            push(value);
          }
        }}
        placeholder="Search role, company, skill or city — e.g. “Senior PM fintech Bengaluru”"
        aria-label="Search product management jobs"
        className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            if (timer.current) clearTimeout(timer.current);
            push("");
          }}
          className="shrink-0 rounded p-1 text-text-faint hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
