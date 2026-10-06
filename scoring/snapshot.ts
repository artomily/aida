/**
 * Assemble one day's scores from stored inputs. Pure: the jobs load rows, call this, and write
 * the result to `daily_snapshot`.
 */
import { confidence } from "./confidence";
import { compose } from "./compose";
import { exposureBySector } from "./exposure";
import { DEFAULT_FLOW, flowBySector, ownershipCrossCheck } from "./flow";
import { SECTORS, type SectorSlug } from "./sectors";
import { DEFAULT_SENSITIVITY, sensitivityBySector, type SensitivityConfig } from "./sensitivity";
import { buildSeries } from "./series";
import { DEFAULT_TRIGGER, triggerBySector } from "./trigger";
import type {
  Company,
  ControlRow,
  ControlSeries,
  EntityAliases,
  EventTaxonomy,
  ExposureGraph,
  NewsItem,
  OwnershipTx,
  PriceRow,
  SectorStructure,
  SensitivityResult,
  Snapshot,
  SnapshotMode,
} from "./types";

export const ALL_CONTROLS: ControlSeries[] = ["spx_fut", "usdidr", "hsi"];

export type SnapshotInput = {
  asOf: string;
  mode: SnapshotMode;
  companies: Company[];
  prices: PriceRow[];
  controls: ControlRow[];
  news: NewsItem[];
  ownership: OwnershipTx[];
  graph: ExposureGraph;
  aliases: EntityAliases;
  taxonomy: EventTaxonomy;
  topN: number;
  /** Weekly estimates from `beta_estimates`; recomputed here when absent. */
  sensitivity?: Map<SectorSlug, SensitivityResult>;
  sensitivityConfig?: SensitivityConfig;
};

export function buildSnapshot(input: SnapshotInput): Omit<Snapshot, "brief"> {
  const cfg = input.sensitivityConfig ?? DEFAULT_SENSITIVITY;
  const series = buildSeries(input.companies, input.prices, input.controls, input.graph, input.topN);
  const sensitivity = input.sensitivity ?? sensitivityBySector(series, cfg);

  const conf = new Map(
    SECTORS.map(({ slug }) => [slug, confidence(series.idx.get(slug)!, series.sgx.get(slug)!.series)]),
  );

  const sectors = compose({
    exposure: exposureBySector(input.graph, input.companies),
    sensitivity,
    flow: flowBySector(input.ownership, input.asOf, input.aliases, DEFAULT_FLOW),
    trigger: triggerBySector(input.news, input.asOf, input.taxonomy, input.aliases, input.graph, DEFAULT_TRIGGER),
    confidence: conf,
  });

  const dates = [...new Set(input.prices.filter((p) => p.market === "IDX").map((p) => p.date))].sort();
  const used = [...new Set([...sensitivity.values()].flatMap((s) => s.controls))];
  const notes: string[] = [];
  if (dates.length < cfg.window + 20)
    notes.push(`Riwayat harga baru ${dates.length} hari bursa; uji sensitivitas butuh sekitar ${cfg.window + 20}.`);
  if (used.length < ALL_CONTROLS.length)
    notes.push("Sebagian variabel kontrol global belum tersedia; regresi berjalan tanpa variabel tersebut.");

  return {
    date: input.asOf,
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    sectors,
    validation: {
      significant: [...sensitivity.values()].filter((s) => s.significant).length,
      reverseSignificant: [...sensitivity.values()].filter((s) => s.reverse.significant).length,
      sameDaySignificant: [...sensitivity.values()].filter((s) => s.sameDay?.significant).length,
      alpha: cfg.alpha,
      window: cfg.window,
      history: { from: dates[0] ?? null, to: dates.at(-1) ?? null, days: dates.length },
      controlsUsed: used,
      controlsMissing: ALL_CONTROLS.filter((c) => !used.includes(c)),
      ownershipMatches: ownershipCrossCheck(input.ownership, input.aliases),
    },
    notes,
    structure: sectorStructure(input.companies),
  };
}

/** IDX sector → sub-sector breakdown by market cap, with the five largest emiten per sub-sector. */
export function sectorStructure(companies: Company[], topN = 5): Partial<Record<SectorSlug, SectorStructure>> {
  const out: Partial<Record<SectorSlug, SectorStructure>> = {};
  for (const c of companies) {
    if (c.market !== "IDX" || !c.sector) continue;
    const cap = c.marketCap ?? 0;
    const sec = (out[c.sector] ??= { companies: 0, marketCap: 0, subsectors: [] });
    sec.companies++;
    sec.marketCap += cap;
    const name = c.subSector ?? "Lainnya";
    let sub = sec.subsectors.find((x) => x.name === name);
    if (!sub) sec.subsectors.push((sub = { name, companies: 0, marketCap: 0, top: [] }));
    sub.companies++;
    sub.marketCap += cap;
    sub.top.push({ symbol: c.symbol, name: c.name, marketCap: cap });
  }
  for (const sec of Object.values(out)) {
    sec!.subsectors.sort((a, b) => b.marketCap - a.marketCap);
    for (const sub of sec!.subsectors) sub.top = sub.top.sort((a, b) => b.marketCap - a.marketCap).slice(0, topN);
  }
  return out;
}
