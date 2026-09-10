"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { monogram } from "@/lib/utils";

/**
 * Company logo with graceful fallback to a monogram tile. Uses a plain <img>
 * (many external hosts, no optimisation benefit) with lazy loading.
 */
export function Logo({
  name,
  src,
  size = 44,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImg = src && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] font-display text-gold-soft",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full bg-white object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="select-none">{monogram(name)}</span>
      )}
    </span>
  );
}
