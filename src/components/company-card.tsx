import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { Company } from "@/types/job";
import { Logo } from "@/components/ui/logo";
import { pluralize } from "@/lib/utils";

export function CompanyCard({
  company,
  openRoles,
}: {
  company: Company;
  openRoles: number;
}) {
  return (
    <Link
      href={`/companies/${company.id}`}
      className="group flex items-start gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]"
    >
      <Logo
        name={company.name}
        src={company.logo}
        domain={company.domain}
        size={44}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-display text-[16px] text-text">
            {company.name}
          </h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-text-faint transition-colors group-hover:text-gold" />
        </div>
        <p className="mt-0.5 truncate text-[13px] text-text-muted">
          {company.industry ?? "Technology"}
          {company.companySize ? ` · ${company.companySize}` : ""}
        </p>
        <p className="mt-3 text-[13px] font-medium text-gold-soft">
          {pluralize(openRoles, "open role")}
        </p>
      </div>
    </Link>
  );
}
