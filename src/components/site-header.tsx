"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { cn, monogram } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile, firstName } from "@/lib/profile";

const NAV = [
  { href: "/jobs", label: "Jobs" },
  { href: "/companies", label: "Companies" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { profile, hydrated } = useProfile();
  const name = firstName(profile);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="PM Dream Job home">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-[rgba(216,179,106,0.3)] bg-[var(--gold-dim)] font-display text-[15px] text-gold-soft">
            P
          </span>
          <span className="font-display text-[17px] tracking-tight text-text">
            PM Dream Job
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "text-text"
                    : "text-text-muted hover:text-text",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {hydrated && name ? (
            <Link
              href="/welcome"
              className="hidden items-center gap-2 rounded-full border border-[var(--border-strong)] py-1 pl-1 pr-3 text-sm text-text-muted transition-colors hover:text-text sm:inline-flex"
              title="Edit your profile"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--gold-dim)] font-display text-[11px] text-gold-soft">
                {monogram(profile!.fullName)}
              </span>
              {name}
            </Link>
          ) : (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="hidden sm:inline-flex"
            >
              <Link href="/welcome">Set up profile</Link>
            </Button>
          )}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/jobs">Browse jobs</Link>
          </Button>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border-strong)] text-text-muted md:hidden"
          >
            <span className="relative block h-3 w-4">
              <span
                className={cn(
                  "absolute left-0 h-[1.5px] w-full bg-current transition-all",
                  open ? "top-1.5 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 top-1.5 h-[1.5px] w-full bg-current transition-all",
                  open && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 h-[1.5px] w-full bg-current transition-all",
                  open ? "top-1.5 -rotate-45" : "top-3",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--bg)] md:hidden">
          <nav className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm text-text-muted hover:text-text"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/welcome"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-3 text-sm text-gold-soft"
            >
              {hydrated && name ? `${name} — edit profile` : "Set up profile"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
