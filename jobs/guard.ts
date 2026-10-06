/**
 * Credit guards that live in the database, so they hold on Vercel where every invocation
 * starts with fresh in-memory counters:
 *
 *   once-per-day  a fetching job is skipped when its work is already done — today's live
 *                 snapshot exists (daily stages) or betas are under a week old (weekly)
 *   daily budget  upstream calls summed from today's `job_runs` (WIB day) may not exceed
 *                 SECTORS_MAX_CALLS_PER_DAY; the remainder becomes the run's allowance
 *
 * An admin can force past the once-per-day lock; nothing forces past the daily budget except
 * the backfill, which is confirmed and estimated separately.
 */
import type { Ctx } from "./context";
import { daysAgo, todayWib } from "./context";

export const dailyCap = () => Number(process.env.SECTORS_MAX_CALLS_PER_DAY ?? 150);

const DAILY_JOBS = ["pipeline", "sgx", "news", "score"];

/** Upstream calls recorded since 00:00 WIB today. */
export async function callsToday(ctx: Ctx): Promise<number> {
  const start = new Date(`${todayWib()}T00:00:00+07:00`).toISOString();
  const runs = await ctx.store.listJobRuns(500);
  return runs.filter((r) => r.startedAt >= start).reduce((n, r) => n + r.upstreamCalls, 0);
}

/** Why this job need not fetch again, or null when it should run. */
export async function alreadyDone(ctx: Ctx, job: string, asOf = todayWib()): Promise<string | null> {
  if (DAILY_JOBS.includes(job)) {
    const snap = await ctx.store.getSnapshot(asOf);
    return snap?.date === asOf && snap.mode === "live" ? `snapshot ${asOf} sudah ada` : null;
  }
  if (job === "weekly") {
    const betas = await ctx.store.getLatestBetas();
    return betas && betas.asOf > daysAgo(asOf, 6) ? `beta ${betas.asOf} masih kurang dari seminggu` : null;
  }
  return null;
}
