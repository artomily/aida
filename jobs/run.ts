/**
 * CLI for the jobs (admins can also run them from /admin). Loads `.env` via tsx.
 *
 *   npm run ingest:backfill -- --plan      estimate calls, touch nothing
 *   npm run ingest:backfill -- --yes       run it
 *   npm run job:daily -- [sgx|news|score|pipeline]
 *   npm run job:weekly
 *
 * Daily / weekly jobs skip themselves when today's work is done; add --force to run anyway.
 */
import { hasKey, isMock } from "../ingest/client";
import { defaultBackfill, planBackfill, runBackfill } from "./backfill";
import { context } from "./context";
import { runDaily, type Stage } from "./daily";
import { recorded } from "./runlog";
import { runWeeklyBeta } from "./weekly-beta";

const [job, ...args] = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const asOf = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

async function main() {
  const ctx = await context();
  console.log(`store: ${ctx.store.kind} · upstream: ${isMock() ? "mock" : "sectors.app"}${hasKey() ? "" : " (no key)"}`);

  let run;
  switch (job) {
    case "backfill": {
      const opts = { ...defaultBackfill(), ...(asOf ? { asOf } : {}) };
      const plan = planBackfill(ctx, opts);
      console.log(JSON.stringify(plan, null, 2));
      if (flag("--plan")) return;
      if (!flag("--yes") && !isMock()) {
        console.log(`\nThis can spend up to ${plan.total} sectors.app credits (stored closes are never re-fetched). Re-run with --yes.`);
        return;
      }
      // The hourly cap guards the app; a backfill is a deliberate, budgeted exception.
      process.env.SECTORS_MAX_CALLS_PER_HOUR = String(Math.max(plan.total + 50, Number(process.env.SECTORS_MAX_CALLS_PER_HOUR ?? 0)));
      run = await recorded(ctx, "backfill", "cli", () => runBackfill(ctx, opts));
      break;
    }
    case "daily": {
      const stage = (args.find((a) => ["sgx", "news", "score", "pipeline"].includes(a)) ?? "pipeline") as Stage;
      run = await recorded(ctx, stage, "cli", async () => ({ status: "ok", message: await runDaily(ctx, stage, asOf) }), { force: flag("--force") });
      break;
    }
    case "weekly":
      run = await recorded(ctx, "weekly", "cli", async () => {
        const r = await runWeeklyBeta(ctx, asOf);
        return { status: "ok", message: `${[...r.values()].filter((x) => x.significant).length}/11 sektor signifikan` };
      }, { force: flag("--force") });
      break;
    default:
      console.log("usage: tsx jobs/run.ts <backfill|daily|weekly> [stage] [YYYY-MM-DD] [--plan|--yes|--force]");
      process.exitCode = 1;
      return;
  }
  console.log(`${run.status}: ${run.message ?? ""} · ${run.upstreamCalls} upstream calls`);
  if (run.status === "error") process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
