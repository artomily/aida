import { MEMBERS, seededRandom } from "./model";

/**
 * Per-emiten report shown on the sector page.
 *
 * This is the shape the UI reads. When the real feed lands, keep this type and
 * replace the body of `getCompanyReport` — nothing in the components has to change.
 */
export type CompanyReport = {
  ticker: string;
  name: string;
  /** Last traded price, IDR */
  last: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  /** Traded volume in lots (1 lot = 100 lembar) */
  volumeLot: number;
  /** Traded value, IDR */
  value: number;
  /** Trade count */
  frequency: number;
  /** Market capitalisation, IDR */
  marketCap: number;
  per: number;
  pbv: number;
  /** Net foreign flow today, IDR — positive means net buy */
  foreignNet: number;
  /** Share of the sector index */
  indexWeight: number;
  /** Intraday price path, 09:00 → now */
  intraday: number[];
  notes: { time: string; text: string; source: string }[];
};

const BASE_PRICE: Record<string, number> = {
  BBCA: 9850, BBRI: 4620, BMRI: 6275, BBNI: 5450, GOTO: 71, TLKM: 3180,
  ASII: 5125, UNTR: 26300, ADRO: 2790, PTBA: 3140, ITMG: 25450, MEDC: 1345,
  KLBF: 1580, UNVR: 2410, ICBP: 11300, INDF: 7625, ANTM: 1745, INCO: 4180,
  TPIA: 8250, MDKA: 2130, SMGR: 3960, TOWR: 715, ISAT: 2290, JSMR: 4870,
};

const fixed = (v: number, digits = 2) => +v.toFixed(digits);

/**
 * Deterministic dummy figures — same input always yields the same report.
 * `returnPct` is the emiten's return as the contributors table states it; the
 * intraday path is built to land exactly on it, so the two never disagree.
 */
function dummyReport(
  ticker: string,
  name: string,
  weight: number,
  returnPct: number,
): CompanyReport {
  const rnd = seededRandom("report:" + ticker);
  const prevClose = BASE_PRICE[ticker] ?? Math.round(400 + rnd() * 6000);
  const tick = prevClose >= 5000 ? 25 : prevClose >= 1000 ? 10 : prevClose >= 500 ? 5 : 1;
  const target = Math.max(1, Math.round(prevClose * (1 + returnPct / 100)));

  // Wander toward the close, then pin the last point to it.
  const steps = 40;
  const intraday: number[] = [];
  let p = prevClose;
  for (let i = 0; i < steps - 1; i++) {
    const pull = (target - p) / (steps - i);
    p = Math.max(1, Math.round(p + pull + tick * (rnd() - 0.5) * 2.4));
    intraday.push(p);
  }
  intraday.push(target);

  const last = target;
  const open = intraday[0];
  const high = Math.max(...intraday);
  const low = Math.min(...intraday);
  const change = last - prevClose;

  const volumeLot = Math.round(8_000 + rnd() * 780_000);
  const sharesOut = Math.round((4 + rnd() * 120) * 1e9);

  return {
    ticker,
    name,
    last,
    change,
    changePct: fixed((change / prevClose) * 100),
    open,
    high,
    low,
    prevClose,
    volumeLot,
    value: volumeLot * 100 * last,
    frequency: Math.round(900 + rnd() * 34_000),
    marketCap: sharesOut * last,
    per: fixed(5 + rnd() * 26, 1),
    pbv: fixed(0.5 + rnd() * 4.2, 2),
    foreignNet: Math.round((rnd() - 0.45) * 2.4e11),
    indexWeight: weight,
    intraday,
    notes: dummyNotes(ticker, change >= 0, rnd),
  };
}

function dummyNotes(ticker: string, up: boolean, rnd: () => number) {
  const pool = up
    ? [
        "Volume di atas rata-rata 20 hari sejak menit pembukaan.",
        "Net buy asing berlanjut tiga sesi berturut-turut.",
        "Harga menembus resistance sesi sebelumnya pada 09:12.",
        "Broker asing mendominasi sisi beli pada jam pertama.",
      ]
    : [
        "Net sell asing terkonsentrasi pada 20 menit pertama.",
        "Harga gagal bertahan di atas level pembukaan.",
        "Volume tipis — pergerakan digerakkan order kecil.",
        "Tekanan jual muncul setelah data sektor dirilis.",
      ];
  // Draw three distinct notes, then keep the session order.
  const remaining = [...pool];
  const picked = [0, 1, 2].map(() => remaining.splice(Math.floor(rnd() * remaining.length), 1)[0]);
  const times = ["09:07", "09:24", "09:41", "10:02"];
  const start = Math.floor(rnd() * 2);
  const sources = ["DATA PASAR", "ARUS KSEI", "CATATAN DESK"];

  return picked.map((text, i) => ({
    time: times[start + i],
    text,
    source: sources[i],
  }));
}

const WEIGHTS = [24.5, 18.2, 14.1, 11.6, 9.4, 8.0, 7.3, 6.9];

/**
 * Report for one emiten.
 *
 * TODO(api): swap the dummy generator for the real feed. If the feed is async,
 * change this to `Promise<CompanyReport>` and the caller awaits it — the UI
 * already renders from this type alone.
 */
export function getCompanyReport(
  sectorSlug: string,
  ticker: string,
  returnPct: number,
): CompanyReport | null {
  const members = MEMBERS[sectorSlug] ?? [];
  const index = members.findIndex((m) => m[0] === ticker);
  if (index < 0) return null;
  return dummyReport(ticker, members[index][1], WEIGHTS[index] ?? 5, returnPct);
}

const idr = new Intl.NumberFormat("id-ID");

export const formatIDR = (v: number) => idr.format(Math.round(v));

/** Compact rupiah for large figures: 1,2 T / 340,5 M / 12,4 jt */
export function formatCompactIDR(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1).replace(".", ",")} T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1).replace(".", ",")} jt`;
  return sign + idr.format(Math.round(abs));
}
