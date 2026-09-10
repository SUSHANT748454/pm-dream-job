"use client";

import { ChevronDown } from "lucide-react";

import { SORT_OPTIONS } from "@/lib/filters";
import type { JobSort } from "@/types/job";

export function SortSelect({
  value,
  onChange,
}: {
  value: JobSort;
  onChange: (next: JobSort) => void;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Sort jobs</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as JobSort)}
        className="appearance-none rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-card)] py-2 pl-3 pr-9 text-sm text-text focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-text-faint" />
    </label>
  );
}
