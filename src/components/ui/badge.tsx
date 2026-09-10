import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "gold" | "accent" | "positive" | "danger" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--bg-elevated)] text-text-muted border-[var(--border)]",
  gold: "bg-[var(--gold-dim)] text-gold-soft border-[rgba(216,179,106,0.28)]",
  accent: "bg-[var(--accent-soft)] text-[#aeb8ff] border-[rgba(124,140,255,0.28)]",
  positive: "bg-[rgba(91,191,138,0.12)] text-[#8fd8b3] border-[rgba(91,191,138,0.26)]",
  danger: "bg-[rgba(224,115,107,0.12)] text-[#e3a19b] border-[rgba(224,115,107,0.26)]",
  outline: "bg-transparent text-text-muted border-[var(--border-strong)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium leading-5 tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
