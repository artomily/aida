export const POS = "#d19a3f";
export const NEG = "#b0564a";

export const DIVERGENT_THRESHOLD = 2.0;
export const WATCH_THRESHOLD = 1.0;

export type Status = "DIVERGENT" | "WATCH" | "NORMAL";

export type Sector = {
  slug: string;
  code: string;
  name: string;
  /** expected return, % */
  e: number;
  /** actual return, % */
  a: number;
  /** residual z-score */
  z: number;
};

export const SECTORS: Sector[] = [
  { slug: "financials", code: "IDXFIN", name: "Financials", e: 0.42, a: 0.55, z: 0.6 },
  { slug: "energy", code: "IDXENER", name: "Energy", e: -0.31, a: 1.24, z: 2.7 },
  { slug: "basic-materials", code: "IDXBASIC", name: "Basic Materials", e: 0.68, a: 0.21, z: -1.1 },
  { slug: "industrials", code: "IDXINDUS", name: "Industrials", e: 0.15, a: 0.09, z: -0.2 },
  { slug: "consumer-cyclicals", code: "IDXCYC", name: "Consumer Cyclicals", e: 0.24, a: 0.4, z: 0.5 },
  { slug: "consumer-non-cyclicals", code: "IDXNONCYC", name: "Consumer Non-Cyclicals", e: -0.08, a: -0.12, z: -0.1 },
  { slug: "healthcare", code: "IDXHEALTH", name: "Healthcare", e: 0.33, a: -0.58, z: -2.2 },
  { slug: "technology", code: "IDXTECH", name: "Technology", e: 0.91, a: 1.35, z: 0.9 },
  { slug: "infrastructure", code: "IDXINFRA", name: "Infrastructure", e: 0.11, a: 0.46, z: 1.3 },
  { slug: "properties", code: "IDXPROP", name: "Properties & Real Estate", e: -0.19, a: -0.27, z: -0.3 },
  { slug: "transportation", code: "IDXTRANS", name: "Transportation", e: 0.05, a: 0.52, z: 1.0 },
];

export const MEMBERS: Record<string, [string, string][]> = {
  financials: [
    ["BBCA", "Bank Central Asia"],
    ["BBRI", "Bank Rakyat Indonesia"],
    ["BMRI", "Bank Mandiri"],
    ["BBNI", "Bank Negara Indonesia"],
    ["BRIS", "Bank Syariah Indonesia"],
    ["ARTO", "Bank Jago"],
    ["BTPS", "BTPN Syariah"],
    ["BJBR", "Bank Jabar Banten"],
  ],
  energy: [
    ["ADRO", "Alamtri Resources"],
    ["PTBA", "Bukit Asam"],
    ["ITMG", "Indo Tambangraya"],
    ["MEDC", "Medco Energi"],
    ["PGAS", "Perusahaan Gas Negara"],
    ["HRUM", "Harum Energy"],
    ["INDY", "Indika Energy"],
    ["AKRA", "AKR Corporindo"],
  ],
  "basic-materials": [
    ["ANTM", "Aneka Tambang"],
    ["INCO", "Vale Indonesia"],
    ["TPIA", "Chandra Asri"],
    ["MDKA", "Merdeka Copper Gold"],
    ["SMGR", "Semen Indonesia"],
    ["INKP", "Indah Kiat Pulp"],
    ["BRPT", "Barito Pacific"],
    ["TKIM", "Pabrik Kertas Tjiwi"],
  ],
  industrials: [
    ["ASII", "Astra International"],
    ["UNTR", "United Tractors"],
    ["ARNA", "Arwana Citramulia"],
    ["IMPC", "Impack Pratama"],
    ["KRAS", "Krakatau Steel"],
    ["GJTL", "Gajah Tunggal"],
    ["MARK", "Mark Dynamics"],
    ["JECC", "Jembo Cable"],
  ],
  "consumer-cyclicals": [
    ["MAPI", "MAP Aktif Adiperkasa"],
    ["ACES", "Aspirasi Hidup Indonesia"],
    ["MAPA", "Map Aktif"],
    ["ERAA", "Erajaya Swasembada"],
    ["MNCN", "Media Nusantara Citra"],
    ["SCMA", "Surya Citra Media"],
    ["RALS", "Ramayana Lestari"],
    ["LPPF", "Matahari Dept. Store"],
  ],
  "consumer-non-cyclicals": [
    ["UNVR", "Unilever Indonesia"],
    ["ICBP", "Indofood CBP"],
    ["INDF", "Indofood Sukses Makmur"],
    ["AMRT", "Sumber Alfaria Trijaya"],
    ["MYOR", "Mayora Indah"],
    ["CPIN", "Charoen Pokphand"],
    ["JPFA", "Japfa Comfeed"],
    ["GGRM", "Gudang Garam"],
  ],
  healthcare: [
    ["KLBF", "Kalbe Farma"],
    ["SIDO", "Sido Muncul"],
    ["MIKA", "Mitra Keluarga"],
    ["HEAL", "Medikaloka Hermina"],
    ["SILO", "Siloam Hospitals"],
    ["PRDA", "Prodia Widyahusada"],
    ["DVLA", "Darya-Varia"],
    ["PEHA", "Phapros"],
  ],
  technology: [
    ["GOTO", "GoTo Gojek Tokopedia"],
    ["DCII", "DCI Indonesia"],
    ["EMTK", "Elang Mahkota Teknologi"],
    ["MTDL", "Metrodata Electronics"],
    ["MLPT", "Multipolar Technology"],
    ["WIFI", "Solusi Sinergi Digital"],
    ["EDGE", "Indointernet"],
    ["TOSK", "Toska Mitra"],
  ],
  infrastructure: [
    ["TLKM", "Telkom Indonesia"],
    ["TOWR", "Sarana Menara Nusantara"],
    ["ISAT", "Indosat Ooredoo"],
    ["JSMR", "Jasa Marga"],
    ["EXCL", "XLSmart Telecom"],
    ["PGEO", "Pertamina Geothermal"],
    ["ADHI", "Adhi Karya"],
    ["WIKA", "Wijaya Karya"],
  ],
  properties: [
    ["BSDE", "Bumi Serpong Damai"],
    ["CTRA", "Ciputra Development"],
    ["PWON", "Pakuwon Jati"],
    ["SMRA", "Summarecon Agung"],
    ["DMAS", "Puradelta Lestari"],
    ["LPKR", "Lippo Karawaci"],
    ["APLN", "Agung Podomoro"],
    ["KIJA", "Kawasan Industri Jababeka"],
  ],
  transportation: [
    ["ASSA", "Adi Sarana Armada"],
    ["BIRD", "Blue Bird"],
    ["SMDR", "Samudera Indonesia"],
    ["TMAS", "Temas"],
    ["IPCM", "Jasa Armada Indonesia"],
    ["CMPP", "AirAsia Indonesia"],
    ["HELI", "Jaya Trishindo"],
    ["WEHA", "WEHA Transportasi"],
  ],
};

const sign = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");

export const fmt = (v: number) => sign(v) + Math.abs(v).toFixed(2) + "%";
export const fmtZ = (v: number) => sign(v) + Math.abs(v).toFixed(1);
export const fmtPP = (v: number) => sign(v) + Math.abs(v).toFixed(2);

/** Deterministic PRNG seeded from a string, so figures stay stable between renders. */
export function seededRandom(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 100000;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export function statusOf(z: number): Status {
  const az = Math.abs(z);
  return az >= DIVERGENT_THRESHOLD ? "DIVERGENT" : az >= WATCH_THRESHOLD ? "WATCH" : "NORMAL";
}

export function badgeStyle(status: Status, pos: boolean): React.CSSProperties {
  const c = status === "DIVERGENT" ? (pos ? POS : NEG) : status === "WATCH" ? "#9a938a" : "#6f6960";
  return {
    display: "inline-block",
    padding: "2px 8px",
    fontFamily: "var(--font-mono)",
    fontSize: "9.5px",
    letterSpacing: "0.12em",
    color: c,
    border: "1px solid " + c,
    borderRadius: "2px",
    width: "fit-content",
    opacity: status === "NORMAL" ? 0.7 : 1,
  };
}

export type Contributor = {
  ticker: string;
  company: string;
  retV: number;
  weightV: number;
  contribV: number;
};

const WEIGHTS = [24.5, 18.2, 14.1, 11.6, 9.4, 8.0, 7.3, 6.9];

export function contributorsOf(sector: Sector): Contributor[] {
  const rnd = seededRandom(sector.slug);
  return (MEMBERS[sector.slug] ?? []).slice(0, 8).map((m, i) => {
    const spread = (rnd() - 0.45) * 2.6 * (i < 2 ? 1.5 : 1);
    const ret = +(sector.a + spread).toFixed(2);
    return {
      ticker: m[0],
      company: m[1],
      retV: ret,
      weightV: WEIGHTS[i],
      contribV: +((WEIGHTS[i] / 100) * (ret - sector.e)).toFixed(2),
    };
  });
}

/** 60 days of rolling correlation, mean-reverting around 0.46. */
export function correlationSeries(slug: string): number[] {
  const rnd = seededRandom(slug + "corr");
  const pts: number[] = [];
  let v = 0.46 + (rnd() - 0.5) * 0.16;
  for (let i = 0; i < 60; i++) {
    v = Math.max(0.08, Math.min(0.78, v + (rnd() - 0.5) * 0.07 + (0.46 - v) * 0.06));
    pts.push(v);
  }
  return pts;
}

export const chartX = (i: number) => (i / 59) * 300;
export const chartY = (val: number) => 126 - ((val - 0.05) / 0.75) * 112;

export type View = "board" | "detail" | "methodology";

/**
 * Mean |z| across all sectors for the last 30 sessions — the board's dispersion.
 * Synthesised deterministically; the live product would read this from the model run.
 */
export function dispersionSeries(): number[] {
  const rnd = seededRandom("dispersion-15sep2026");
  const out: number[] = [];
  let v = 0.72;
  for (let i = 0; i < 29; i++) {
    v = Math.max(0.28, Math.min(1.45, v + (rnd() - 0.5) * 0.22 + (0.78 - v) * 0.12));
    out.push(+v.toFixed(2));
  }
  // Today's value is the one the board actually shows.
  const today = SECTORS.reduce((a, s) => a + Math.abs(s.z), 0) / SECTORS.length;
  out.push(+today.toFixed(2));
  return out;
}

export function statusMix() {
  const counts = { DIVERGENT: 0, WATCH: 0, NORMAL: 0 } as Record<Status, number>;
  for (const s of SECTORS) counts[statusOf(s.z)]++;
  return counts;
}
