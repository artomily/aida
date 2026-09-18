import type { SectorSlug } from "./types";

/** Display order and labels — identical to the IDX board so both panels line up row for row. */
export const SECTOR_ORDER: { slug: SectorSlug; name: string }[] = [
  { slug: "financials", name: "Keuangan" },
  { slug: "energy", name: "Energi" },
  { slug: "basic-materials", name: "Barang Baku" },
  { slug: "industrials", name: "Perindustrian" },
  { slug: "consumer-cyclicals", name: "Konsumen Non-Primer" },
  { slug: "consumer-non-cyclicals", name: "Konsumen Primer" },
  { slug: "healthcare", name: "Kesehatan" },
  { slug: "technology", name: "Teknologi" },
  { slug: "infrastructure", name: "Infrastruktur & Telko" },
  { slug: "properties", name: "Properti & REIT" },
  { slug: "transportation", name: "Transportasi & Logistik" },
];

export const SECTOR_NAME = Object.fromEntries(SECTOR_ORDER.map((s) => [s.slug, s.name])) as Record<
  SectorSlug,
  string
>;

/*
 * IDX-IC and SGX label their sectors differently, and SGX's source data carries duplicate
 * variants ("Consumer Cyclical" / "Consumer Cyclicals", "Real Estate" / "REIT" …). Match on
 * normalised keywords rather than exact strings so both land on the same shared slug.
 * Order matters: the first rule that matches wins.
 */
const RULES: [RegExp, SectorSlug][] = [
  [/non[- ]?cyclical|staples|defensive|food|beverage|agri|plantation|tobacco/, "consumer-non-cyclicals"],
  [/cyclical|discretionary|retail|leisure|hotel|media|apparel|automotive/, "consumer-cyclicals"],
  [/financ|bank|insur|credit|asset[- ]management|capital market/, "financials"],
  [/energy|oil|gas|coal|petrol/, "energy"],
  [/basic[- ]?material|material|chemical|metal|mining|paper|forestry|steel|cement/, "basic-materials"],
  [/health|pharma|medical|hospital|biotech/, "healthcare"],
  [/tech|software|semiconductor|electronic|hardware|it[- ]service/, "technology"],
  [/infra|telecom|communication|utilit|power|water|toll/, "infrastructure"],
  [/propert|real[- ]?estate|reit|trust|construction|developer/, "properties"],
  [/transport|logistic|airline|shipping|marine|aviation|freight/, "transportation"],
  [/industrial|conglomerate|machinery|engineering|aerospace|defen[cs]e/, "industrials"],
];

/** Map any provider sector / sub-sector label (or slug) onto a shared slug. */
export function toSectorSlug(...labels: (string | null | undefined)[]): SectorSlug | null {
  for (const raw of labels) {
    if (!raw) continue;
    const s = raw.toLowerCase().replace(/[_&]/g, " ");
    for (const [re, slug] of RULES) if (re.test(s)) return slug;
  }
  return null;
}
