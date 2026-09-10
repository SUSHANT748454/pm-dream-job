import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Posted 2 days ago" style relative date from an ISO (YYYY-MM-DD) string. */
export function relativeDate(iso: string): string {
  const then = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : "")).getTime();
  if (Number.isNaN(then)) return "Recently";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  return `${Math.floor(days / 30)} months ago`;
}

export function isWithinDays(iso: string, days: number): boolean {
  const then = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : "")).getTime();
  if (Number.isNaN(then)) return false;
  return Date.now() - then <= days * 86_400_000;
}

/** Turn arbitrary text into a URL-safe slug fragment. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Monogram for a company name, e.g. "Razorpay" -> "R", "Tata 1mg" -> "T1". */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function formatSalary(
  salary: { min: number | null; max: number | null; currency: string; period: string | null } | null,
): string | null {
  if (!salary || (salary.min == null && salary.max == null)) return null;
  const sym = salary.currency === "INR" ? "₹" : salary.currency === "USD" ? "$" : `${salary.currency} `;
  const fmt = (n: number) => {
    if (salary.currency === "INR") {
      if (n >= 1e7) return `${(n / 1e7).toFixed(n % 1e7 === 0 ? 0 : 1)}Cr`;
      if (n >= 1e5) return `${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 1)}L`;
      if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
    } else if (n >= 1e3) {
      return `${Math.round(n / 1e3)}K`;
    }
    return `${n}`;
  };
  const range =
    salary.min != null && salary.max != null
      ? `${fmt(salary.min)}–${fmt(salary.max)}`
      : fmt((salary.min ?? salary.max) as number);
  const per = salary.period === "month" ? "/mo" : salary.period === "year" ? "/yr" : "";
  return `${sym}${range}${per}`;
}

export function pluralize(n: number, one: string, many = one + "s"): string {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
}
