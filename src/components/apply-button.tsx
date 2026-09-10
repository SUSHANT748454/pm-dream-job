"use client";

import { ArrowUpRight } from "lucide-react";

import type { Job } from "@/types/job";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApplyButton({
  job,
  className,
  size = "lg",
  label = "Apply on company website",
}: {
  job: Job;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  return (
    <Button
      asChild
      size={size}
      className={cn("w-full sm:w-auto", className)}
    >
      <a
        href={job.applyUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() =>
          trackEvent({
            name: "apply_clicked",
            props: {
              jobId: job.id,
              slug: job.slug,
              company: job.company.name,
              source: job.source,
            },
          })
        }
      >
        {label}
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </Button>
  );
}
