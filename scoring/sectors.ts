/**
 * The 11 scored IDX-IC sectors. `Listed Investment Product` is excluded on purpose: it holds
 * ETFs and investment vehicles, so its returns are derivative of the other sectors and would
 * produce spurious correlation.
 */
export const SECTORS = [
  { slug: "financials", name: "Keuangan" },
  { slug: "energy", name: "Energi" },
  { slug: "basic-materials", name: "Barang Baku" },
  { slug: "industrials", name: "Perindustrian" },
  { slug: "consumer-cyclicals", name: "Konsumen Non-Primer" },
  { slug: "consumer-non-cyclicals", name: "Konsumen Primer" },
  { slug: "healthcare", name: "Kesehatan" },
  { slug: "technology", name: "Teknologi" },
  { slug: "infrastructure", name: "Infrastruktur" },
  { slug: "properties", name: "Properti & Real Estat" },
  { slug: "transportation", name: "Transportasi & Logistik" },
] as const;

export type SectorSlug = (typeof SECTORS)[number]["slug"];

export const SECTOR_NAME = Object.fromEntries(SECTORS.map((s) => [s.slug, s.name])) as Record<SectorSlug, string>;

export const isSectorSlug = (s: string): s is SectorSlug => s in SECTOR_NAME;

/*
 * Provider labels differ between IDX and SGX and carry duplicate variants upstream
 * ("Consumer Cyclical" / "Consumer Cyclicals", "Real Estate" / "REIT"), so match on
 * normalised keywords. Order matters: the first rule that matches wins.
 */
const RULES: [RegExp, SectorSlug | null][] = [
  [/listed investment|investment product|\betfs?\b/, null],
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

/** Map a provider sector / sub-sector label (or slug) onto a scored sector; null = not scored. */
export function toSectorSlug(...labels: (string | null | undefined)[]): SectorSlug | null {
  for (const raw of labels) {
    if (!raw) continue;
    const s = raw.toLowerCase().replace(/[_&-]/g, " ");
    for (const [re, slug] of RULES) if (re.test(s)) return slug;
  }
  return null;
}
