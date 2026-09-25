import { defaultBackfill, runBackfill } from "./jobs/backfill";
import { context } from "./jobs/context";
import { recorded } from "./jobs/runlog";
async function main() {
  const ctx = await context();
  console.log("store", ctx.store.kind);
  for (let i = 1; i <= 20; i++) {
    const run = await recorded(ctx, "backfill", "admin", () => runBackfill(ctx, defaultBackfill(), Date.now() + 8000));
    console.log(`slice ${i}: ${run.status} · ${run.upstreamCalls} calls · ${run.message}`);
    if (run.status !== "partial") break;
  }
  console.log((await ctx.store.listJobRuns(3)).map((r) => `${r.job}/${r.status}`).join(", "));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
