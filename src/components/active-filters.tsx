"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";

import { FILTER_KEYS, FILTER_LABELS, type FilterKey } from "@/lib/filters";

export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const chips: { key: FilterKey | "q"; value: string; label: string }[] = [];
  const q = params.get("q");
  if (q) chips.push({ key: "q", value: q, label: `“${q}”` });
  for (const key of FILTER_KEYS) {
    for (const value of params.getAll(key)) {
      chips.push({ key, value, label: value });
    }
  }
  if (chips.length === 0) return null;

  function remove(key: FilterKey | "q", value: string) {
    const sp = new URLSearchParams(params.toString());
    if (key === "q") sp.delete("q");
    else {
      const rest = sp.getAll(key).filter((v) => v !== value);
      sp.delete(key);
      for (const v of rest) sp.append(key, v);
    }
    sp.delete("page");
    startTransition(() =>
      router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, {
        scroll: false,
      }),
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value}`}
          onClick={() => remove(chip.key, chip.value)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)] py-1 pl-3 pr-2 text-[13px] text-text-muted transition-colors hover:text-text"
        >
          {chip.key !== "q" && (
            <span className="text-text-faint">{FILTER_LABELS[chip.key]}:</span>
          )}
          {chip.label}
          <X className="h-3.5 w-3.5 text-text-faint transition-colors group-hover:text-danger" />
        </button>
      ))}
    </div>
  );
}
