import { cn } from "@/lib/utils";
import type { MatchBand } from "@/lib/ats";

const STYLES: Record<MatchBand, string> = {
  high: "border-emerald-500/35 bg-emerald-500/12 text-emerald-300",
  medium: "border-amber-500/35 bg-amber-500/12 text-amber-300",
  low: "border-[var(--border-strong)] bg-[var(--bg-elevated)] text-text-faint",
};

const WORD: Record<MatchBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function MatchBadge({
  score,
  band,
  className,
  showScore = true,
  compact = false,
}: {
  score: number;
  band: MatchBand;
  className?: string;
  showScore?: boolean;
  /** Just a coloured score pill — for tight spaces like list rows. */
  compact?: boolean;
}) {
  const title = `ATS match ${score}/100 — on-device keyword & skills overlap with this role`;

  if (compact) {
    return (
      <span
        title={title}
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border px-1.5 text-[10px] font-semibold tabular-nums",
          STYLES[band],
          className,
        )}
      >
        {score}
      </span>
    );
  }

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STYLES[band],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          band === "high" && "bg-emerald-400",
          band === "medium" && "bg-amber-400",
          band === "low" && "bg-text-faint",
        )}
      />
      {WORD[band]} match{showScore ? ` · ${score}` : ""}
    </span>
  );
}
