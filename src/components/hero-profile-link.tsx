"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useProfile, firstName } from "@/lib/profile";

export function HeroProfileLink() {
  const { profile, hydrated } = useProfile();
  if (!hydrated) return <div className="h-5" />;

  return (
    <Link
      href="/welcome"
      className="group inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
    >
      {profile
        ? `Welcome back, ${firstName(profile)} — edit your profile`
        : "Set up your profile for roles tailored to your level"}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
