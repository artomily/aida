/**
 * Every pipeline run leaves a row in `job_runs`: started, finished, status, upstream calls. The
 * admin page reads it to confirm users got today's data, and to see what a run cost.
 */
import { randomUUID } from "node:crypto";
import type { JobRun } from "../db/store";
import { setAllowance, usage } from "../ingest/client";
import type { Ctx } from "./context";
import { alreadyDone, callsToday, dailyCap } from "./guard";

export type RunResult = { status: "ok" | "partial"; message: string };

/**
 * Run `fn` as a logged job behind the credit guards (jobs/guard.ts). `force` skips the
 * once-per-day lock, never the daily budget. The backfill is exempt from both: it is estimated
 * and confirmed up front, and raises the hourly cap to its own plan.
 */
export async function recorded(
  ctx: Ctx,
  job: string,
  trigger: JobRun["trigger"],
  fn: () => Promise<RunResult>,
  { force = false }: { force?: boolean } = {},
): Promise<JobRun> {
  const before = usage().total;
  const run: JobRun = {
    id: randomUUID(),
    job,
    trigger,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    upstreamCalls: 0,
    message: null,
  };
  const guarded = job !== "backfill";
  const done = guarded && !force ? await alreadyDone(ctx, job) : null;
  const left = guarded ? dailyCap() - (await callsToday(ctx)) : null;

  await ctx.store.putJobRun(run);
  try {
    if (done) Object.assign(run, { status: "ok", message: `Dilewati: ${done}. Tidak ada kredit terpakai.` });
    else if (left !== null && left <= 0)
      Object.assign(run, { status: "error", message: `Batas harian ${dailyCap()} panggilan sectors.app sudah habis. Coba lagi besok.` });
    else {
      setAllowance(left);
      Object.assign(run, await fn());
    }
  } catch (e) {
    run.status = "error";
    run.message = e instanceof Error ? e.message.slice(0, 500) : String(e);
  } finally {
    setAllowance(null);
  }
  run.finishedAt = new Date().toISOString();
  run.upstreamCalls = usage().total - before;
  await ctx.store.putJobRun(run);
  return run;
}
