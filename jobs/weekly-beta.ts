/**
 * Weekly: refresh the company universe (market caps, sector labels) and re-estimate the
 * lagged-SGX betas for all 11 sectors. Daily scoring reuses the latest estimate.
 */
import { fetchCompanies } from "../ingest/universe";
import type { SectorSlug } from "../scoring/sectors";
import { sensitivityBySector } from "../scoring/sensitivity";
import { buildSeries } from "../scoring/series";
import type { Company, ControlRow, PriceRow, SensitivityResult } from "../scoring/types";
import { type Ctx, HISTORY_DAYS, TOP_N, daysAgo, log, todayWib } from "./context";

export async function runWeeklyBeta(
  ctx: Ctx,
  asOf = todayWib(),
  /** Already-loaded inputs, when the caller has them (first daily run, backfill). */
  loaded?: { companies: Company[]; prices: PriceRow[]; controls: ControlRow[] },
): Promise<Map<SectorSlug, SensitivityResult>> {
  let companies = loaded?.companies;
  if (!companies) {
    companies = [...(await fetchCompanies("IDX")), ...(await fetchCompanies("SGX"))];
    await ctx.store.putCompanies(companies);
  }
  const from = daysAgo(asOf, HISTORY_DAYS);
  const prices = loaded?.prices ?? (await ctx.store.getPrices(from));
  const controls = loaded?.controls ?? (await ctx.store.getControls(from));

  const results = sensitivityBySector(buildSeries(companies, prices, controls, ctx.graph, TOP_N));
  await ctx.store.putBetas(asOf, results);

  const sig = [...results].filter(([, r]) => r.significant).map(([s]) => s);
  log("weekly-beta", `${sig.length}/11 sectors significant after BH${sig.length ? `: ${sig.join(", ")}` : ""}`);
  return results;
}
