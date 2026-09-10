"use client";

import { X } from "lucide-react";

import { FILTER_LABELS, type FilterKey } from "@/lib/filters";

export function ActiveFilters({
  chips,
  onRemove,
}: {
  chips: { key: FilterKey | "q"; value: string }[];
  onRemove: (key: FilterKey | "q", value: string) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value}`}
          onClick={() => onRemove(chip.key, chip.value)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)] py-1 pl-3 pr-2 text-[13px] text-text-muted transition-colors hover:text-text"
        >
          {chip.key !== "q" && (
            <span className="text-text-faint">{FILTER_LABELS[chip.key]}:</span>
          )}
          {chip.key === "q" ? `“${chip.value}”` : chip.value}
          <X className="h-3.5 w-3.5 text-text-faint transition-colors group-hover:text-danger" />
        </button>
      ))}
    </div>
  );
}
