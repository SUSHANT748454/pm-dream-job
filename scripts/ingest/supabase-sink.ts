import { createClient } from "@supabase/supabase-js";

import type { Company, Job } from "../../src/types/job.ts";

/**
 * Mirror the ingestion result into Supabase (`jobs` + `companies`). Uses the
 * service-role key, so it bypasses RLS. If the env vars aren't set — e.g. a
 * local `npm run ingest` — it silently skips, and jobs.json remains the only
 * output.
 */

function quote(id: string): string {
  return `"${id.replace(/"/g, "")}"`;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function syncToSupabase(
  jobs: Job[],
  companies: Company[],
): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("  Supabase: env not set — skipping DB sync");
    return;
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const companyRows = companies.map((c) => ({
    id: c.id,
    name: c.name,
    data: c as unknown as Record<string, unknown>,
    updated_at: now,
  }));

  const jobRows = jobs.map((j) => ({
    id: j.id,
    slug: j.slug,
    title: j.title,
    company_id: j.company.id,
    data: j as unknown as Record<string, unknown>,
    posted_at: j.postedAt,
    status: j.status,
    first_seen_at: j.firstSeenAt,
    last_seen_at: j.lastSeenAt,
    updated_at: now,
  }));

  for (const rows of chunk(companyRows, 500)) {
    const { error } = await sb.from("companies").upsert(rows);
    if (error) throw new Error(`companies upsert: ${error.message}`);
  }
  for (const rows of chunk(jobRows, 500)) {
    const { error } = await sb.from("jobs").upsert(rows);
    if (error) throw new Error(`jobs upsert: ${error.message}`);
  }

  // Prune rows that no longer exist in the dataset.
  if (jobRows.length) {
    const { error } = await sb
      .from("jobs")
      .delete()
      .not("id", "in", `(${jobRows.map((r) => quote(r.id)).join(",")})`);
    if (error) console.warn(`  Supabase: job prune failed: ${error.message}`);
  }
  if (companyRows.length) {
    await sb
      .from("companies")
      .delete()
      .not("id", "in", `(${companyRows.map((r) => quote(r.id)).join(",")})`);
  }

  console.log(
    `  Supabase: synced ${jobRows.length} jobs · ${companyRows.length} companies`,
  );
}
