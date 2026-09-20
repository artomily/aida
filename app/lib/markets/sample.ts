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

/*
 * Sub-sector per sample ticker, in each exchange's own vocabulary (IDX-IC for IDX, SGX's
 * industry labels for SGX) — the same kind of labels sectors.app returns in `sub_sector`.
 */
const SUB: Record<string, string> = {
  // IDX
  BBCA: "Banks", BBRI: "Banks", BMRI: "Banks", BBNI: "Banks", BRIS: "Banks", ARTO: "Banks", BTPS: "Banks", BJBR: "Banks", NISP: "Banks",
  ADRO: "Coal", PTBA: "Coal", ITMG: "Coal", HRUM: "Coal", INDY: "Coal", MEDC: "Oil & Gas", PGAS: "Oil & Gas", AKRA: "Oil & Gas",
  ANTM: "Metals & Minerals", INCO: "Metals & Minerals", MDKA: "Metals & Minerals", TPIA: "Chemicals", BRPT: "Chemicals",
  SMGR: "Construction Materials", INKP: "Forestry & Paper", TKIM: "Forestry & Paper",
  ASII: "Multi-sector Holdings", UNTR: "Industrial Goods", ARNA: "Industrial Goods", IMPC: "Industrial Goods", KRAS: "Industrial Goods",
  JECC: "Industrial Goods", MARK: "Industrial Goods", GJTL: "Automobiles & Components",
  MAPI: "Retailing", ACES: "Retailing", MAPA: "Retailing", ERAA: "Retailing", RALS: "Retailing", LPPF: "Retailing",
  MNCN: "Media & Entertainment", SCMA: "Media & Entertainment",
  ICBP: "Food & Beverage", INDF: "Food & Beverage", MYOR: "Food & Beverage", CPIN: "Food & Beverage", JPFA: "Food & Beverage",
  SMAR: "Agricultural Products", SIMP: "Agricultural Products", LSIP: "Agricultural Products", AALI: "Agricultural Products",
  UNVR: "Nondurable Household Products", AMRT: "Food & Staples Retailing", GGRM: "Tobacco",
  KLBF: "Pharmaceuticals", SIDO: "Pharmaceuticals", DVLA: "Pharmaceuticals", PEHA: "Pharmaceuticals",
  MIKA: "Healthcare Providers", HEAL: "Healthcare Providers", SILO: "Healthcare Providers", PRDA: "Healthcare Providers",
  GOTO: "Software & IT Services", DCII: "Software & IT Services", EMTK: "Software & IT Services", MLPT: "Software & IT Services",
  WIFI: "Software & IT Services", EDGE: "Software & IT Services", TOSK: "Software & IT Services", MTDL: "Technology Hardware & Equipment",
  TLKM: "Telecommunication", TOWR: "Telecommunication", ISAT: "Telecommunication", EXCL: "Telecommunication",
  JSMR: "Transportation Infrastructure", PGEO: "Utilities", ADHI: "Heavy Constructions & Civil Engineering",
  WIKA: "Heavy Constructions & Civil Engineering",
  BSDE: "Properties & Real Estate", CTRA: "Properties & Real Estate", PWON: "Properties & Real Estate", SMRA: "Properties & Real Estate",
  DMAS: "Properties & Real Estate", LPKR: "Properties & Real Estate", APLN: "Properties & Real Estate", KIJA: "Properties & Real Estate",
  DUTI: "Properties & Real Estate",
  ASSA: "Transportation", BIRD: "Transportation", SMDR: "Transportation", TMAS: "Transportation", IPCM: "Transportation",
  CMPP: "Transportation", HELI: "Transportation", WEHA: "Transportation",
  // SGX
  D05: "Banks & Credit Services", O39: "Banks & Credit Services", U11: "Banks & Credit Services", S68: "Financial Data & Stock Exchanges",
  RE4: "Coal", "5WH": "Oil & Gas E&P", S20: "Industrial Metals & Mining",
  J36: "Conglomerates", C07: "Conglomerates", BN4: "Conglomerates", S63: "Aerospace & Defense", "5E2": "Shipbuilding", BS6: "Shipbuilding",
  G13: "Resorts & Casinos", LJ3: "Lodging",
  F34: "Farm Products", E5H: "Farm Products", "5JS": "Farm Products", EB5: "Farm Products", P8Z: "Farm Products",
  OV8: "Grocery Stores", Y92: "Beverages",
  BSL: "Medical Care Facilities", H02: "Drug Manufacturers",
  V03: "Electronic Components", "558": "Semiconductor Equipment", AWX: "Semiconductor Equipment",
  Z74: "Telecom Services", CC3: "Telecom Services", CJLU: "Telecom Services", U96: "Utilities",
  C38U: "REIT - Retail", D5IU: "REIT - Retail", "9CI": "Real Estate Services", U14: "Real Estate - Diversified",
  C09: "Real Estate - Development", A26: "Real Estate - Development",
  C6L: "Airlines", S58: "Airports & Air Services", C52: "Ground Transportation",
};

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
      subSector: SUB[code] ?? null,
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
