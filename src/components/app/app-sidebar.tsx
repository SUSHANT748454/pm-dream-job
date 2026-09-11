"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Search,
  KanbanSquare,
  BookOpen,
  Mic,
  BellRing,
  ArrowUpRight,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from "lucide-react";

import { cn, monogram } from "@/lib/utils";
import { useProfile, firstName } from "@/lib/profile";

const NAV = [
  { href: "/app", label: "Job Search", icon: Search, exact: true },
  { href: "/app/tracker", label: "Application Tracker", icon: KanbanSquare },
  { href: "/app/alerts", label: "Job Alerts", icon: BellRing },
  { href: "/app/questions", label: "Question Bank", icon: BookOpen },
  { href: "/app/interview", label: "AI Mock Interview", icon: Mic, soon: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "group/sb sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-[rgba(216,179,106,0.3)] bg-[var(--gold-dim)] font-display text-[15px] text-gold-soft">
            P
          </span>
          {!collapsed && (
            <span className="whitespace-nowrap font-display text-[15px] tracking-tight text-text">
              PM Dream Job
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-md p-1 text-text-faint hover:text-text"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--bg-card)] text-text"
                  : "text-text-muted hover:bg-[var(--bg-card)] hover:text-text",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-gold" : "text-text-faint",
                )}
              />
              {!collapsed && (
                <span className="flex flex-1 items-center justify-between">
                  {item.label}
                  {item.soon && (
                    <span className="rounded-full bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-faint">
                      soon
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-[var(--border)] p-3">
        {!collapsed && (
          <Link
            href="/jobs"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-text-faint hover:text-text"
          >
            <ArrowUpRight className="h-4 w-4" />
            Public job board
          </Link>
        )}
        <Link
          href="/welcome"
          className={cn(
            "flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm text-text",
            collapsed && "justify-center",
          )}
          title="Your profile"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--gold-dim)] font-display text-[12px] text-gold-soft">
            {profile ? monogram(profile.fullName) : <Sparkles className="h-3.5 w-3.5" />}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-text">
                {profile ? firstName(profile) : "Set up profile"}
              </span>
              <span className="block truncate text-[11px] text-text-faint">
                {profile?.currentDesignation ?? "On-device profile"}
              </span>
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}

/** Compact top bar shown instead of the sidebar on mobile. */
export function AppMobileBar() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-30 flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 md:hidden scroll-slim">
      <Link href="/" className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-[rgba(216,179,106,0.3)] bg-[var(--gold-dim)] font-display text-[13px] text-gold-soft">
        P
      </Link>
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px]",
              active
                ? "bg-[var(--bg-card)] text-text"
                : "text-text-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
