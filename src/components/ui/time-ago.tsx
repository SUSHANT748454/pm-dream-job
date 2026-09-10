import { relativeDate } from "@/lib/utils";

/**
 * Relative timestamp ("2 days ago"). `relativeDate` reads the clock, so the
 * server and client can render marginally different text at a day boundary —
 * `suppressHydrationWarning` tells React that's expected and not an error.
 */
export function TimeAgo({
  iso,
  prefix = "",
  className,
}: {
  iso: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {prefix}
      {relativeDate(iso)}
    </time>
  );
}
