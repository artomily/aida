/**
 * One-off history load. This is where the bulk of the API quota goes, so `planBackfill`
 * estimates the call count first and the CLI refuses to run without `--yes`.
 *
 * Every raw response is cached on disk (`.cache/sectors/`); closed 90-day windows never
 * expire, so re-running after a crash only pays for what is still missing.
 */
import { fetchSgxNews } from "../ingest/news";
import { fetchFilings } from "../ingest/ownership";
import { historyCalls } from "../ingest/prices";
import { fetchCompanies } from "../ingest/universe";
import { SECTORS } from "../scoring/sectors";
import { STI, constituents, sgxSymbols } from "../scoring/series";
import { type Ctx, TOP_N, daysAgo, log, todayWib } from "./context";
import { catchUpPrices, runScore } from "./daily";
import type { RunResult } from "./runlog";
import { runWeeklyBeta } from "./weekly-beta";

export type BackfillOptions = { years: number; topN: number; asOf: string };

export const defaultBackfill = (): BackfillOptions => ({
  years: Number(process.env.BACKFILL_YEARS ?? 3),
  topN: TOP_N,
  asOf: todayWib(),
});

/** Upper-bound call estimate, computed without touching the API. */
export function planBackfill(ctx: Ctx, o: BackfillOptions) {
  const from = daysAgo(o.asOf, Math.round(o.years * 365));
  const to = daysAgo(o.asOf, 1);
  const idxSymbols = SECTORS.length * o.topN;
  const sgx = sgxSymbols(ctx.graph).length;
  const calls = {
    universe: 6 + 4,
    idxHistory: historyCalls(idxSymbols, from, to),
    sgxHistory: historyCalls(sgx, from, to),
    // 60 days of filings at 30/page, and a week of SGX news for the linked names — rough ceilings.
    filings: 40,
    news: 10,
  };
  return { from, to, idxSymbols, sgxSymbols: sgx, calls, total: Object.values(calls).reduce((a, b) => a + b, 0) };
}

/**
 * Resumable: with a `deadline` it stops between symbols and reports how far it got, so the admin
 * page can run it in slices that fit a serverless request. Each call continues where the last
 * one stopped — stored closes are never fetched twice.
 */
export async function runBackfill(ctx: Ctx, o: BackfillOptions, deadline?: number): Promise<RunResult> {
  const plan = planBackfill(ctx, o);
  log("backfill", `${plan.from} → ${plan.to}, up to ${plan.total} calls`);

  let companies = await ctx.store.getCompanies();
  if (!companies.some((c) => c.market === "IDX")) {
    companies = [...(await fetchCompanies("IDX")), ...(await fetchCompanies("SGX"))];
    await ctx.store.putCompanies(companies);
  }
  await ctx.store.putRelationships(ctx.graph);

  const symbols = [...sgxSymbols(ctx.graph), ...[...constituents(companies, o.topN).values()].flat().map((c) => c.symbol)];
  const p = await catchUpPrices(ctx.store, symbols, plan.from, plan.to, "backfill", { fillBack: true, deadline });
  if (!p.complete)
    return { status: "partial", message: `Riwayat harga ${p.done}/${p.total} simbol — jalankan lagi untuk melanjutkan.` };

  await ctx.store.putOwnership(await fetchFilings(daysAgo(o.asOf, 60)));
  await ctx.store.putNews(await fetchSgxNews(sgxSymbols(ctx.graph).filter((s) => s !== STI), daysAgo(o.asOf, 7)));

  const betas = await runWeeklyBeta(ctx, o.asOf, {
    companies,
    prices: await ctx.store.getPrices(plan.from),
    controls: await ctx.store.getControls(plan.from),
  });
  const snapshot = await runScore(ctx, o.asOf);
  return {
    status: "ok",
    message: `Backfill selesai: ${p.total} simbol, ${[...betas.values()].filter((b) => b.significant).length}/11 sektor signifikan, snapshot ${snapshot.date}.`,
  };
}
