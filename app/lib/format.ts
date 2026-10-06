/** Display formatting — Indonesian decimals, explicit signs, em dash for "not available". */
import { EVENT_LABEL } from "../../scoring/brief";
import type { RelationType } from "../../scoring/types";

const MINUS = "−";

export const dec = (v: number | null | undefined, d = 2) => (v == null ? "—" : v.toFixed(d).replace("-", MINUS).replace(".", ","));

export const signed = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : (v > 0 ? "+" : v < 0 ? MINUS : "") + Math.abs(v).toFixed(d).replace(".", ",");

export const pct = (v: number | null | undefined, d = 0) => (v == null ? "—" : `${(v * 100).toFixed(d).replace(".", ",")}%`);

/** p-values read better with a floor than with a column of zeros. */
export const pval = (v: number | null | undefined) => (v == null ? "—" : v < 0.001 ? "<0,001" : v.toFixed(3).replace(".", ","));

export const bare = (t: string) => t.replace(/\.(SI|JK)$/, "");

export const RELATION_LABEL: Record<RelationType, string> = {
  parent: "Pengendali",
  significant_shareholder: "Pemegang saham signifikan",
  sgx_listed_id_operations: "Tercatat di SGX, beroperasi di Indonesia",
  commodity_trade: "Jalur komoditas / dagang",
  board_overlap: "Satu grup / direksi",
};

export const eventLabel = (t: string) => EVENT_LABEL[t] ?? t.replace(/_/g, " ");

export const DIRECTION_LABEL = { [-1]: "negatif", 0: "ambigu", 1: "positif" } as Record<number, string>;

export function dateLabel(iso: string) {
  return new Date(iso + (iso.length === 10 ? "T00:00:00Z" : "")).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

export function ago(iso: string, now = Date.now()) {
  const h = Math.round((now - Date.parse(iso)) / 3_600_000);
  if (h < 1) return "baru saja";
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

/** IDR market cap, compact: Rp 1.234 T / Rp 56 M. */
export function idr(v: number | null | undefined) {
  if (v == null) return "—";
  const [div, unit] = v >= 1e12 ? [1e12, "T"] : v >= 1e9 ? [1e9, "M"] : [1e6, "jt"];
  return `Rp ${(v / div).toLocaleString("id-ID", { maximumFractionDigits: v / div < 10 ? 1 : 0 })} ${unit}`;
}
