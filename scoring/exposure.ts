/**
 * Exposure (Base): how much of an IDX sector's market cap is structurally tied to SGX.
 *
 *   Exposure(s) = Σ weight(relation) × capShare(linked company in s)
 *
 * capShare is the linked IDX emiten's market cap over the sector's total. SGX-only rows (an
 * SGX-listed company operating in Indonesia, no IDX emiten) use the SGX company's cap
 * converted at `sgdIdr`. Each IDX emiten counts once, at its strongest relation: a parent
 * already implies the board overlap, so summing both would double-count the same cap.
 */
import { SECTORS, type SectorSlug } from "./sectors";
import type { Company, ExposureGraph, ExposureLink, ExposureResult } from "./types";

export function sectorMarketCaps(companies: Company[]): Map<SectorSlug, number> {
  const out = new Map<SectorSlug, number>(SECTORS.map((s) => [s.slug, 0]));
  for (const c of companies)
    if (c.market === "IDX" && c.sector && c.marketCap && c.marketCap > 0) out.set(c.sector, out.get(c.sector)! + c.marketCap);
  return out;
}

export function exposureBySector(graph: ExposureGraph, companies: Company[]): Map<SectorSlug, ExposureResult> {
  const caps = sectorMarketCaps(companies);
  const bySymbol = new Map(companies.map((c) => [c.symbol, c]));
  type Tagged = { link: ExposureLink; key: string };
  const tagged = new Map<SectorSlug, Tagged[]>(SECTORS.map((s) => [s.slug, []]));

  // Strongest relation per (sector, counted company): an IDX emiten, or the SGX entity itself for SGX-only rows.
  const best = new Map<string, Tagged>();
  for (const r of graph.relationships) {
    // The live sector label wins over the curated one, so a reclassified emiten moves with it.
    const sector = (r.idxSymbol && bySymbol.get(r.idxSymbol)?.sector) || r.sector;
    const total = caps.get(sector) ?? 0;
    const counted = r.idxSymbol ?? r.sgxEntity;
    const company = bySymbol.get(counted);
    const cap = company?.marketCap ?? null;
    const capIdr = cap === null ? null : r.idxSymbol ? cap : cap * graph.sgdIdr;
    const capShare = capIdr !== null && total > 0 ? Math.min(1, capIdr / total) : null;
    const weight = graph.relationWeights[r.relation] ?? 0;
    const link: ExposureLink = {
      sgxEntity: r.sgxEntity,
      idxSymbol: r.idxSymbol,
      relation: r.relation,
      weight,
      capShare,
      contribution: 0,
      via: r.via,
      source: r.source,
      verified: r.verified,
    };
    const key = `${sector}|${counted}`;
    tagged.get(sector)!.push({ link, key });
    const prev = best.get(key);
    if (!prev || weight > prev.link.weight) best.set(key, { link, key });
  }

  for (const { link } of best.values()) link.contribution = link.weight * (link.capShare ?? 0);
  return new Map(
    [...tagged].map(([slug, links]) => [
      slug,
      {
        score: Math.min(1, links.reduce((s, t) => s + t.link.contribution, 0)),
        links: links
          .map((t) => t.link)
          .sort((a, b) => b.contribution - a.contribution || b.weight - a.weight),
      },
    ]),
  );
}

/**
 * SGX basket weights per sector for the Sensitivity regression: each linked SGX entity
 * weighted by its strongest relation weight into that sector.
 */
export function sgxBasketWeights(graph: ExposureGraph): Map<SectorSlug, Map<string, number>> {
  const out = new Map<SectorSlug, Map<string, number>>(SECTORS.map((s) => [s.slug, new Map()]));
  for (const r of graph.relationships) {
    const w = graph.relationWeights[r.relation] ?? 0;
    const m = out.get(r.sector)!;
    m.set(r.sgxEntity, Math.max(m.get(r.sgxEntity) ?? 0, w));
  }
  return out;
}
