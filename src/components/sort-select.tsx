"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { SORT_OPTIONS, DEFAULT_SORT } from "@/lib/filters";
import type { JobSort } from "@/types/job";

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const current = (params.get("sort") as JobSort) ?? DEFAULT_SORT;

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Sort jobs</span>
      <select
        value={current}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          if (e.target.value === DEFAULT_SORT) sp.delete("sort");
          else sp.set("sort", e.target.value);
          sp.delete("page");
          startTransition(() =>
            router.replace(
              sp.toString() ? `${pathname}?${sp.toString()}` : pathname,
              { scroll: false },
            ),
          );
        }}
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
