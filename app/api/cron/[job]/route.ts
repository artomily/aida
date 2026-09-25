import type { NextRequest } from "next/server";
import { context } from "../../../../jobs/context";
import { runDaily } from "../../../../jobs/daily";
import { recorded } from "../../../../jobs/runlog";
import { runWeeklyBeta } from "../../../../jobs/weekly-beta";

/**
 * Scheduled entry points (see vercel.json). Vercel Cron sends `Authorization: Bearer
 * $CRON_SECRET`; anything else is refused, so the public can't trigger a paid upstream fetch.
 *
 *   pipeline  weekdays, 05:00–05:59 WIB — the snapshot users read from 06:00
 *   weekly    Mondays, 04:00–04:59 WIB — universe refresh + beta re-estimate
 */
export const maxDuration = 300;

const JOBS = ["pipeline", "weekly"] as const;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/cron/[job]">) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const { job } = await ctx.params;
  if (!(JOBS as readonly string[]).includes(job)) return Response.json({ error: `unknown job ${job}` }, { status: 404 });

  const c = await context();
  // Stop fetching with a minute to spare so the run is logged and the snapshot written.
  const deadline = Date.now() + (maxDuration - 60) * 1000;
  const run = await recorded(c, job, "cron", async () =>
    job === "weekly"
      ? { status: "ok", message: `${[...(await runWeeklyBeta(c)).values()].filter((r) => r.significant).length}/11 sektor signifikan` }
      : { status: "ok", message: await runDaily(c, "pipeline", undefined, deadline) },
  );
  return Response.json(run, { status: run.status === "error" ? 500 : 200 });
}
