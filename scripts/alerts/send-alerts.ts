import { createClient } from "@supabase/supabase-js";

import type { Job, Domain, ExperienceLevel, WorkMode } from "../../src/types/job.ts";

/**
 * Weekly job-alert sender. Reads `job_alerts` + the `jobs` mirror from
 * Supabase (service role — bypasses RLS), finds roles first seen since each
 * subscriber's last send that match their saved filters, and emails them via
 * Resend's HTTP API. Run by `.github/workflows/send-alerts.yml`.
 *
 * Skips cleanly (exit 0) if any required env var is missing, so a fork /
 * local run without secrets doesn't fail CI.
 */

const SITE_URL = process.env.SITE_URL ?? "https://pm-dream-job.vercel.app";
const MIN_DAYS_BETWEEN_SENDS = 6;
const LOOKBACK_DAYS_DEFAULT = 7;
const LOOKBACK_DAYS_MAX = 30;
const MAX_JOBS_IN_EMAIL = 12;

interface AlertRow {
  user_id: string;
  email: string;
  locations: string[] | null;
  experience_levels: string[] | null;
  work_modes: string[] | null;
  domains: string[] | null;
  enabled: boolean;
  last_sent_at: string | null;
}

interface JobRow {
  id: string;
  slug: string;
  data: Job;
  first_seen_at: string | null;
}

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function matches(job: Job, alert: AlertRow): boolean {
  const locations = alert.locations ?? [];
  const levels = alert.experience_levels ?? [];
  const modes = alert.work_modes ?? [];
  const domains = alert.domains ?? [];

  if (locations.length) {
    const set = new Set(locations);
    const cityMatch =
      set.has(job.location.city) || (set.has("Remote") && job.workMode === "Remote");
    if (!cityMatch) return false;
  }
  if (levels.length && !levels.includes(job.experienceLevel as ExperienceLevel)) return false;
  if (modes.length && !modes.includes(job.workMode as WorkMode)) return false;
  if (domains.length && !job.domain.some((d) => domains.includes(d as Domain))) return false;
  return true;
}

function renderEmail(matchedJobs: Job[], totalMatched: number): { subject: string; html: string } {
  const shown = matchedJobs.slice(0, MAX_JOBS_IN_EMAIL);
  const rows = shown
    .map(
      (j) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #2a2a26;">
          <a href="${SITE_URL}/jobs/${j.slug}" style="color:#f4e6c8;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(j.title)}</a>
          <div style="color:#9c9890;font-size:13px;margin-top:3px;">${escapeHtml(j.company.name)} · ${escapeHtml(j.location.city)} · ${escapeHtml(j.workMode)}</div>
        </td>
      </tr>`,
    )
    .join("");
  const more =
    totalMatched > shown.length
      ? `<p style="color:#9c9890;font-size:13px;margin:16px 0 0;">+ ${totalMatched - shown.length} more matching your filters.</p>`
      : "";

  const subject =
    totalMatched === 1
      ? "1 new PM role matching your alert"
      : `${totalMatched} new PM roles matching your alert`;

  const html = `
  <div style="background:#100f0d;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#171613;border:1px solid #2a2a26;border-radius:14px;padding:28px;">
      <p style="color:#d8b36a;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:0;">PM Dream Job</p>
      <h1 style="color:#f4e6c8;font-size:20px;margin:10px 0 4px;">${subject}</h1>
      <p style="color:#9c9890;font-size:13px;margin:0 0 8px;">New since your last alert, matching the filters you set.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      ${more}
      <p style="margin:24px 0 0;">
        <a href="${SITE_URL}/jobs" style="display:inline-block;background:#d8b36a;color:#1a1406;font-size:13px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:8px;">Browse all roles</a>
      </p>
      <p style="color:#6b675e;font-size:11px;margin:28px 0 0;">
        Manage or turn off this alert any time at ${SITE_URL}/app/alerts.
      </p>
    </div>
  </div>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function sendEmail(to: string, subject: string, html: string, apiKey: string, from: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.ALERTS_FROM_EMAIL;

  if (!supabaseUrl || !serviceKey) {
    console.log("Job alerts: Supabase env not set — skipping.");
    return;
  }
  if (!resendKey || !fromAddress) {
    console.log("Job alerts: RESEND_API_KEY / ALERTS_FROM_EMAIL not set — skipping.");
    return;
  }

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: alerts, error: alertsErr } = await sb
    .from("job_alerts")
    .select("*")
    .eq("enabled", true);
  if (alertsErr) {
    // Most likely cause: supabase/schema.sql hasn't been (re-)run yet, so the
    // table doesn't exist. Skip rather than fail the whole scheduled run —
    // this isn't a bug in the script, it's a one-time setup step not done yet.
    console.warn(`Job alerts: couldn't read job_alerts (${alertsErr.message}) — skipping this run.`);
    return;
  }
  if (!alerts || alerts.length === 0) {
    console.log("Job alerts: no enabled subscriptions.");
    return;
  }

  const { data: jobRows, error: jobsErr } = await sb
    .from("jobs")
    .select("id, slug, data, first_seen_at");
  if (jobsErr) throw new Error(`fetch jobs: ${jobsErr.message}`);

  const jobs = (jobRows ?? []) as JobRow[];
  console.log(`Job alerts: ${alerts.length} subscription(s), ${jobs.length} active job(s) mirrored.`);

  let sent = 0;
  let skipped = 0;

  for (const alert of alerts as AlertRow[]) {
    if (alert.last_sent_at && daysAgo(alert.last_sent_at) < MIN_DAYS_BETWEEN_SENDS) {
      skipped++;
      continue;
    }

    const lookbackDays = alert.last_sent_at
      ? Math.min(daysAgo(alert.last_sent_at), LOOKBACK_DAYS_MAX)
      : LOOKBACK_DAYS_DEFAULT;
    const cutoff = Date.now() - lookbackDays * 86_400_000;

    const matched = jobs
      .filter((j) => {
        if (!j.first_seen_at) return false;
        const seen = new Date(j.first_seen_at.slice(0, 10) + "T00:00:00Z").getTime();
        return seen >= cutoff;
      })
      .map((j) => j.data)
      .filter((job) => matches(job, alert))
      .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));

    if (matched.length === 0) {
      skipped++;
      continue;
    }

    const { subject, html } = renderEmail(matched, matched.length);
    try {
      await sendEmail(alert.email, subject, html, resendKey, fromAddress);
      await sb
        .from("job_alerts")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("user_id", alert.user_id);
      sent++;
      console.log(`  sent -> ${alert.email} (${matched.length} roles)`);
    } catch (e) {
      console.warn(`  failed -> ${alert.email}:`, e instanceof Error ? e.message : e);
    }

    // Be gentle with Resend's rate limit.
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(`Job alerts: done. ${sent} sent, ${skipped} skipped (no match / too soon).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
