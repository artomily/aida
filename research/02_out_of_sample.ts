/**
 * Out-of-sample check: estimate the lagged-SGX beta on the first two thirds of history, then
 * ask whether it predicts the direction of the IDX sector on the last third better than a
 * coin. A beta that is significant in-sample but no better than 50% out-of-sample is noise.
 *
 *   npx tsx --env-file-if-exists=.env research/02_out_of_sample.ts
 */
import { context, daysAgo, todayWib, TOP_N } from "../jobs/context";
import { alignLagged } from "../scoring/returns";
import { SECTORS, SECTOR_NAME } from "../scoring/sectors";
import { buildSeries } from "../scoring/series";
import { ols } from "../scoring/stats";

async function main() {
  const ctx = await context();
  const asOf = todayWib();
  const from = daysAgo(asOf, 3 * 365 + 60);
  const series = buildSeries(await ctx.store.getCompanies(), await ctx.store.getPrices(from), [], ctx.graph, TOP_N);

  console.log(["sector".padEnd(26), "n_in".padStart(5), "β_in".padStart(7), "p_in".padStart(7), "n_out".padStart(6), "hit%".padStart(6)].join(" "));
  for (const { slug } of SECTORS) {
    const a = alignLagged(series.idx.get(slug)!, series.sgx.get(slug)!.series);
    const cut = Math.floor(a.y.length * (2 / 3));
    if (cut < 120) {
      console.log(`${SECTOR_NAME[slug].padEnd(26)} not enough history (${a.y.length} days)`);
      continue;
    }
    const fit = ols(a.y.slice(0, cut), [a.x.slice(0, cut)]);
    if (!fit) continue;
    // Direction hit rate on days where SGX actually moved: sign(β·x) vs sign(y).
    let hits = 0;
    let n = 0;
    for (let i = cut; i < a.y.length; i++) {
      if (Math.abs(a.x[i]) < 1e-4 || a.y[i] === 0) continue;
      n++;
      if (Math.sign(fit.beta * a.x[i]) === Math.sign(a.y[i])) hits++;
    }
    console.log(
      [
        SECTOR_NAME[slug].padEnd(26),
        String(cut).padStart(5),
        fit.beta.toFixed(3).padStart(7),
        fit.pValue.toFixed(3).padStart(7),
        String(n).padStart(6),
        (n ? ((hits / n) * 100).toFixed(1) : "—").padStart(6),
      ].join(" "),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
