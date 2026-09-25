/**
 * Which symbols stand for each sector, and the return series built from them. Shared by the
 * ingest layer (to know what to fetch) and the scoring jobs (to know what to regress).
 */
import { sgxBasketWeights } from "./exposure";
import { basketReturns, symbolReturns, type Series } from "./returns";
import { SECTORS, type SectorSlug } from "./sectors";
import type { Company, ControlRow, ControlSeries, ExposureGraph, PriceRow } from "./types";

/** SGX benchmark, fetched from the IDX index endpoint (`sti`) and stored under this symbol. */
export const STI = "STI.SI";

/** The `topN` largest IDX emiten per sector — the constituents of our sector return proxy. */
export function constituents(companies: Company[], topN: number): Map<SectorSlug, Company[]> {
  const out = new Map<SectorSlug, Company[]>(SECTORS.map((s) => [s.slug, []]));
  for (const c of companies) if (c.market === "IDX" && c.sector && (c.marketCap ?? 0) > 0) out.get(c.sector)!.push(c);
  for (const list of out.values()) {
    list.sort((a, b) => b.marketCap! - a.marketCap!);
    list.splice(topN);
  }
  return out;
}

/** Every SGX symbol the pipeline needs prices for: linked entities plus the STI fallback. */
export const sgxSymbols = (graph: ExposureGraph) => [...new Set(graph.relationships.map((r) => r.sgxEntity)), STI];

export type SectorSeries = {
  idx: Map<SectorSlug, Series>;
  sgx: Map<SectorSlug, { series: Series; source: "linked-basket" | "sti" }>;
  controls: Map<ControlSeries, Series>;
};

export function buildSeries(
  companies: Company[],
  prices: PriceRow[],
  controls: ControlRow[],
  graph: ExposureGraph,
  topN: number,
): SectorSeries {
  const returns = symbolReturns(prices);
  const members = constituents(companies, topN);
  const baskets = sgxBasketWeights(graph);
  const sti = returns.get(STI) ?? new Map();

  const idx = new Map<SectorSlug, Series>();
  const sgx = new Map<SectorSlug, { series: Series; source: "linked-basket" | "sti" }>();
  for (const { slug } of SECTORS) {
    // Market-cap weights at today's caps — a documented simplification (see README, Limitations).
    idx.set(slug, basketReturns(returns, new Map(members.get(slug)!.map((c) => [c.symbol, c.marketCap!]))));
    const basket = basketReturns(returns, baskets.get(slug)!);
    // A basket needs a real history before it replaces the benchmark.
    sgx.set(slug, basket.size >= 120 ? { series: basket, source: "linked-basket" } : { series: sti, source: "sti" });
  }

  // Controls are stored as levels; the regression takes their day-over-day change.
  const byControl = new Map<ControlSeries, Series>();
  for (const [name, levels] of Map.groupBy(controls, (c) => c.series)) {
    const sorted = levels.filter((c) => c.value > 0).sort((a, b) => a.date.localeCompare(b.date));
    const s: Series = new Map();
    for (let i = 1; i < sorted.length; i++) s.set(sorted[i].date, sorted[i].value / sorted[i - 1].value - 1);
    byControl.set(name, s);
  }
  return { idx, sgx, controls: byControl };
}
