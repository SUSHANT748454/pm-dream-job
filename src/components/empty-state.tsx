import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title = "No jobs match your search",
  hint = "Try removing a filter or searching for a broader term.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-text-faint">
        <SearchX className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-lg text-text">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-muted">{hint}</p>
      <Button asChild variant="secondary" size="sm" className="mt-5">
        <Link href="/jobs">Clear filters</Link>
      </Button>
    </div>
  );
}
