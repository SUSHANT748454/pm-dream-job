import Link from "next/link";

const LINKS = [
  {
    heading: "Explore",
    items: [
      { href: "/jobs", label: "All jobs" },
      { href: "/jobs?experienceLevel=APM", label: "APM roles" },
      { href: "/jobs?experienceLevel=Senior+Product+Manager", label: "Senior PM roles" },
      { href: "/companies", label: "Companies" },
    ],
  },
  {
    heading: "By city",
    items: [
      { href: "/jobs?location=Bengaluru", label: "Bengaluru" },
      { href: "/jobs?location=Mumbai", label: "Mumbai" },
      { href: "/jobs?location=Delhi+NCR", label: "Delhi NCR" },
      { href: "/jobs?location=Remote", label: "Remote" },
    ],
  },
  {
    heading: "About",
    items: [
      { href: "/about", label: "How it works" },
      { href: "/about#data", label: "Where jobs come from" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-[rgba(216,179,106,0.3)] bg-[var(--gold-dim)] font-display text-[15px] text-gold-soft">
              P
            </span>
            <span className="font-display text-[17px] text-text">PM Dream Job</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
            Product Management jobs across India, gathered in one place and
            refreshed through the day. Apply at the source.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {LINKS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-text-muted transition-colors hover:text-text"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PM Dream Job. Not affiliated with the companies listed.</p>
          <p>Listings link to the original employer or job board.</p>
        </div>
      </div>
    </footer>
  );
}
