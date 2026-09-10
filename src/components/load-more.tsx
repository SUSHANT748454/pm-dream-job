"use client";

import { Button } from "@/components/ui/button";

export function LoadMore({
  remaining,
  onClick,
}: {
  remaining: number;
  onClick: () => void;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <Button variant="secondary" size="lg" onClick={onClick}>
        Show {Math.min(remaining, 12)} more
      </Button>
      <p className="text-xs text-text-faint">{remaining} more roles</p>
    </div>
  );
}
