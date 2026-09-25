/**
 * Every pipeline run leaves a row in `job_runs`: started, finished, status, upstream calls. The
 * admin page reads it to confirm users got today's data, and to see what a run cost.
 */
import { randomUUID } from "node:crypto";
import type { JobRun } from "../db/store";
import { usage } from "../ingest/client";
import type { Ctx } from "./context";

export type RunResult = { status: "ok" | "partial"; message: string };

export async function recorded(ctx: Ctx, job: string, trigger: JobRun["trigger"], fn: () => Promise<RunResult>): Promise<JobRun> {
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
  await ctx.store.putJobRun(run);
  try {
    const r = await fn();
    Object.assign(run, r);
  } catch (e) {
    run.status = "error";
    run.message = e instanceof Error ? e.message.slice(0, 500) : String(e);
  }
  run.finishedAt = new Date().toISOString();
  run.upstreamCalls = usage().total - before;
  await ctx.store.putJobRun(run);
  return run;
}
