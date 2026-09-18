/**
 * Offline fallback used while SECTORS_API_KEY is unset. Real tickers and names, but every
 * price move is a deterministic placeholder (seeded by symbol + date) and the UI labels the
 * whole payload "Data contoh". News is placeholder copy only — never invented headlines about
 * real companies.
 */
import { MEMBERS, seededRandom } from "../model";
import { SEED_LINKS } from "./links";
import { SECTOR_NAME, SECTOR_ORDER } from "./sectors";
import type { Exchange, NewsItem, SectorSlug, Stock } from "./types";

const EXTRA_IDX: [string, string, SectorSlug][] = [
  ["NISP", "Bank OCBC NISP", "financials"],
  ["SMAR", "SMART Tbk", "consumer-non-cyclicals"],
  ["SIMP", "Salim Ivomas Pratama", "consumer-non-cyclicals"],
  ["LSIP", "PP London Sumatra Indonesia", "consumer-non-cyclicals"],
  ["AALI", "Astra Agro Lestari", "consumer-non-cyclicals"],
  ["DUTI", "Duta Pertiwi", "properties"],
];

const SGX: [string, string, SectorSlug][] = [
  ["D05", "DBS Group Holdings", "financials"],
  ["O39", "Oversea-Chinese Banking Corp", "financials"],
  ["U11", "United Overseas Bank", "financials"],
  ["S68", "Singapore Exchange", "financials"],
  ["RE4", "Geo Energy Resources", "energy"],
  ["5WH", "Rex International", "energy"],
  ["S20", "Straits Trading", "basic-materials"],
  ["J36", "Jardine Matheson Holdings", "industrials"],
  ["C07", "Jardine Cycle & Carriage", "industrials"],
  ["S63", "ST Engineering", "industrials"],
  ["BN4", "Keppel", "industrials"],
  ["5E2", "Seatrium", "industrials"],
  ["BS6", "Yangzijiang Shipbuilding", "industrials"],
  ["G13", "Genting Singapore", "consumer-cyclicals"],
  ["LJ3", "OUE", "consumer-cyclicals"],
  ["F34", "Wilmar International", "consumer-non-cyclicals"],
  ["E5H", "Golden Agri-Resources", "consumer-non-cyclicals"],
  ["5JS", "Indofood Agri Resources", "consumer-non-cyclicals"],
  ["EB5", "First Resources", "consumer-non-cyclicals"],
  ["P8Z", "Bumitama Agri", "consumer-non-cyclicals"],
  ["OV8", "Sheng Siong Group", "consumer-non-cyclicals"],
  ["Y92", "Thai Beverage", "consumer-non-cyclicals"],
  ["BSL", "Raffles Medical Group", "healthcare"],
  ["H02", "Haw Par", "healthcare"],
  ["V03", "Venture Corp", "technology"],
  ["558", "UMS Integration", "technology"],
  ["AWX", "AEM Holdings", "technology"],
  ["Z74", "Singapore Telecommunications", "infrastructure"],
  ["CC3", "StarHub", "infrastructure"],
  ["U96", "Sembcorp Industries", "infrastructure"],
  ["CJLU", "NetLink NBN Trust", "infrastructure"],
  ["C38U", "CapitaLand Integrated Commercial Trust", "properties"],
  ["9CI", "CapitaLand Investment", "properties"],
  ["U14", "UOL Group", "properties"],
  ["C09", "City Developments", "properties"],
  ["A26", "Sinarmas Land", "properties"],
  ["D5IU", "Lippo Malls Indonesia Retail Trust", "properties"],
  ["C6L", "Singapore Airlines", "transportation"],
  ["S58", "SATS", "transportation"],
  ["C52", "ComfortDelGro", "transportation"],
];

const today = () => new Date().toISOString().slice(0, 10);

function moves(exchange: Exchange, rows: [string, string, SectorSlug][]): Stock[] {
  const day = today();
  const factor = Object.fromEntries(
    SECTOR_ORDER.map((s) => [s.slug, (seededRandom(`${exchange}:${s.slug}:${day}`)() - 0.5) * 0.024]),
  );
  return rows.map(([code, name, sector]) => {
    const rnd = seededRandom(`${code}:${day}`);
    const change = +(factor[sector] + (rnd() - 0.5) * 0.028).toFixed(4);
    return {
      symbol: `${code}.${exchange === "IDX" ? "JK" : "SI"}`,
      name,
      exchange,
      sector,
      subSector: null,
      marketCap: null,
      price: +(exchange === "IDX" ? 200 + rnd() * 9000 : 0.2 + rnd() * 40).toFixed(exchange === "IDX" ? 0 : 2),
      change,
    };
  });
}

export function sampleUniverse(): { idx: Stock[]; sgx: Stock[] } {
  const idxRows: [string, string, SectorSlug][] = [
    ...Object.entries(MEMBERS).flatMap(([slug, list]) => list.map(([c, n]) => [c, n, slug as SectorSlug] as [string, string, SectorSlug])),
    ...EXTRA_IDX,
  ];
  const idx = moves("IDX", idxRows);
  const sgx = moves("SGX", SGX);

  // Linked emiten lean on their parent's move so the sample reads like a connected market.
  const all = new Map([...idx, ...sgx].map((s) => [s.symbol, s]));
  for (const l of SEED_LINKS) {
    const a = all.get(l.from);
    const b = all.get(l.to);
    if (a?.change != null && b?.change != null) b.change = +(b.change * 0.5 + a.change * 0.5).toFixed(4);
  }
  return { idx, sgx };
}

export function sampleNews(): NewsItem[] {
  const now = Date.now();
  return SECTOR_ORDER.flatMap((s, i) =>
    (["IDX", "SGX"] as Exchange[]).map((ex, j) => ({
      id: `sample:${ex}:${s.slug}`,
      exchange: ex,
      title: `Contoh — berita ${SECTOR_NAME[s.slug]} ${ex === "IDX" ? "Indonesia" : "Singapura"} akan tampil di sini`,
      summary:
        "Ini teks pengganti. Setelah SECTORS_API_KEY dipasang, panel ini menampilkan berita terbaru dari sectors.app lengkap dengan emiten terkait, sentimen, dan tanda risiko.",
      url: null,
      timestamp: new Date(now - (i * 2 + j) * 37 * 60000).toISOString(),
      symbols: [],
      sector: s.slug,
      tags: ["Contoh"],
      sentiment: "neutral" as const,
      risk: false,
    })),
  );
}
