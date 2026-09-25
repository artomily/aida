/**
 * RUN THIS FIRST (after the backfill). Does lagged SGX return explain the next IDX session, per
 * sector, after multiple-testing correction — and does the answer survive a different window?
 *
 * If no sector is significant after Benjamini–Hochberg, stop and reframe: Exposure alone is
 * still a valid linkage map, but the Sensitivity component should be reported as "not found"
 * rather than tuned until something shows up.
 *
 *   npm run research:leadlag
 *
 * A TypeScript script rather than a notebook so it runs on the exact scoring code the
 * dashboard uses — there is no second implementation to drift.
 */
import { context, daysAgo, todayWib, TOP_N } from "../jobs/context";
import { SECTOR_NAME } from "../scoring/sectors";
import { DEFAULT_SENSITIVITY, sensitivityBySector } from "../scoring/sensitivity";
import { buildSeries } from "../scoring/series";

const f = (v: number | null, d = 3) => (v === null ? "—" : v.toFixed(d));

async function main() {
  const ctx = await context();
  const asOf = todayWib();
  const from = daysAgo(asOf, 3 * 365 + 60);
  const [companies, prices, controls] = await Promise.all([
    ctx.store.getCompanies(),
    ctx.store.getPrices(from),
    ctx.store.getControls(from),
  ]);
  if (!prices.length) {
    console.log("No stored prices. Run `npm run ingest:backfill -- --plan` first.");
    return;
  }
  const series = buildSeries(companies, prices, controls, ctx.graph, TOP_N);

  for (const window of [DEFAULT_SENSITIVITY.window, 120]) {
    const res = sensitivityBySector(series, { ...DEFAULT_SENSITIVITY, window });
    console.log(`\n── window ${window} days · alpha ${DEFAULT_SENSITIVITY.alpha} (BH across 11 sectors) ──`);
    console.log(
      ["sector".padEnd(26), "sgx".padEnd(13), "n".padStart(4), "β SG→ID".padStart(8), "p".padStart(7), "p_adj".padStart(7), "stab".padStart(5), "β ID→SG".padStart(8), "p_adj".padStart(7)].join(" "),
    );
    for (const [slug, r] of res) {
      console.log(
        [
          SECTOR_NAME[slug].padEnd(26),
          r.sgxSeries.padEnd(13),
          String(r.n).padStart(4),
          f(r.beta).padStart(8),
          f(r.pValue).padStart(7),
          (f(r.pAdjusted) + (r.significant ? "*" : " ")).padStart(7),
          f(r.stability, 2).padStart(5),
          f(r.reverse.beta).padStart(8),
          (f(r.reverse.pAdjusted) + (r.reverse.significant ? "*" : " ")).padStart(7),
        ].join(" "),
      );
    }
    const sig = [...res.values()].filter((r) => r.significant).length;
    const rev = [...res.values()].filter((r) => r.reverse.significant).length;
    console.log(`significant SG→ID: ${sig}/11 · ID→SG: ${rev}/11 · controls used: ${[...new Set([...res.values()].flatMap((r) => r.controls))].join(", ") || "none"}`);
    if (window === DEFAULT_SENSITIVITY.window && sig === 0)
      console.log("VERDICT: no sector survives correction — report Sensitivity as not found; Exposure stands on its own as a linkage map.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
