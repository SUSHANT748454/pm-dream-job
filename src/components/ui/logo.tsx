"use client";

import * as React from "react";

import { cn, monogram } from "@/lib/utils";

/**
 * Company mark. When a source gives us a real logo URL we show it; otherwise we
 * render an elegant monogram tile — consistent and on-brand, rather than a
 * grab-bag of mismatched favicons.
 */
export function Logo({
  name,
  src,
  domain: _domain,
  size = 44,
  className,
}: {
  name: string;
  src?: string | null;
  domain?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImg = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] font-display text-gold-soft",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
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
