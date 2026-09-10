"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LoadMore({
  nextPage,
  remaining,
}: {
  nextPage: number;
  remaining: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <Button
        variant="secondary"
        size="lg"
        disabled={pending}
        onClick={() => {
          const sp = new URLSearchParams(params.toString());
          sp.set("page", String(nextPage));
          startTransition(() =>
            router.replace(`${pathname}?${sp.toString()}`, { scroll: false }),
          );
        }}
      >
        {pending ? "Loading…" : `Show ${Math.min(remaining, 12)} more`}
      </Button>
      <p className="text-xs text-text-faint">{remaining} more roles</p>
    </div>
  );
}
