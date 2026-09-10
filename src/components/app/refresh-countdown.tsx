"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { msToNextRefresh } from "@/lib/tracker";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function RefreshCountdown() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMs(msToNextRefresh());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-text-muted">
      <Clock className="h-3.5 w-3.5 text-gold" />
      Fresh jobs in{" "}
      <span className="font-mono tabular-nums text-text" suppressHydrationWarning>
        {ms == null ? "--:--:--" : fmt(ms)}
      </span>
    </span>
  );
}
