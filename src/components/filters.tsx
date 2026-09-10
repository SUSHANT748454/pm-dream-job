"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";

import {
  FILTER_KEYS,
  FILTER_LABELS,
  FILTER_OPTIONS,
  type FilterKey,
} from "@/lib/filters";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export type Facets = Record<FilterKey, Record<string, number>>;

function useFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selected = useMemo(() => {
    const map = {} as Record<FilterKey, Set<string>>;
    for (const key of FILTER_KEYS) map[key] = new Set(params.getAll(key));
    return map;
  }, [params]);

  const activeCount = FILTER_KEYS.reduce((n, k) => n + selected[k].size, 0);

  const toggle = useCallback(
    (key: FilterKey, value: string) => {
      const sp = new URLSearchParams(params.toString());
      const current = sp.getAll(key);
      sp.delete(key);
      const active = current.includes(value);
      const next = active
        ? current.filter((v) => v !== value)
        : [...current, value];
      for (const v of next) sp.append(key, v);
      sp.delete("page");
      startTransition(() =>
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false }),
      );
      trackEvent({
        name: "filter_applied",
        props: { filter: key, value, active: !active },
      });
    },
    [params, pathname, router],
  );

  const clearAll = useCallback(() => {
    const sp = new URLSearchParams(params.toString());
    for (const key of FILTER_KEYS) sp.delete(key);
    sp.delete("page");
    startTransition(() =>
      router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, {
        scroll: false,
      }),
    );
  }, [params, pathname, router]);

  return { selected, activeCount, toggle, clearAll, pending };
}

function FilterGroup({
  filterKey,
  facets,
  selected,
  onToggle,
}: {
  filterKey: FilterKey;
  facets: Facets;
  selected: Set<string>;
  onToggle: (key: FilterKey, value: string) => void;
}) {
  const counts = facets[filterKey] ?? {};
  return (
    <div className="py-5">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-text-faint">
        {FILTER_LABELS[filterKey]}
      </h3>
      <ul className="space-y-0.5">
        {FILTER_OPTIONS[filterKey].map((option) => {
          const active = selected.has(option);
          const count = counts[option] ?? 0;
          const disabled = count === 0 && !active;
          return (
            <li key={option}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(filterKey, option)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  active
                    ? "text-text"
                    : disabled
                      ? "cursor-not-allowed text-text-faint/50"
                      : "text-text-muted hover:bg-[var(--bg-elevated)] hover:text-text",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid h-4 w-4 place-items-center rounded-[5px] border transition-colors",
                      active
                        ? "border-gold bg-gold text-[#1a1406]"
                        : "border-[var(--border-strong)]",
                    )}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {option}
                </span>
                <span className="tabular-nums text-xs text-text-faint">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterList({
  facets,
  selected,
  onToggle,
}: {
  facets: Facets;
  selected: Record<FilterKey, Set<string>>;
  onToggle: (key: FilterKey, value: string) => void;
}) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {FILTER_KEYS.map((key) => (
        <FilterGroup
          key={key}
          filterKey={key}
          facets={facets}
          selected={selected[key]}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export function FiltersSidebar({ facets }: { facets: Facets }) {
  const { selected, activeCount, toggle, clearAll } = useFilterState();
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 scroll-slim">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[15px] text-text">Filters</h2>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
            >
              Clear all ({activeCount})
            </button>
          )}
        </div>
        <FilterList facets={facets} selected={selected} onToggle={toggle} />
      </div>
    </aside>
  );
}

export function FiltersMobileTrigger({ facets }: { facets: Facets }) {
  const { selected, activeCount, toggle, clearAll } = useFilterState();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-card)] px-3.5 py-2.5 text-sm text-text lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-semibold text-[#1a1406]">
              {activeCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,90vw)] flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <Dialog.Title className="font-display text-[15px] text-text">
              Filters
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-text-faint hover:text-text">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 scroll-slim">
            <FilterList facets={facets} selected={selected} onToggle={toggle} />
          </div>
          <div className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-4">
            <button
              onClick={clearAll}
              className="flex-1 rounded-[var(--radius)] border border-[var(--border-strong)] py-2.5 text-sm text-text-muted"
            >
              Clear all
            </button>
            <Dialog.Close className="flex-1 rounded-[var(--radius)] bg-gold py-2.5 text-sm font-medium text-[#1a1406]">
              Show results
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
