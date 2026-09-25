/**
 * Morning Brief inputs and the deterministic fallback text. The LLM (jobs/brief.ts) only
 * rewrites these already-computed facts into prose; it never produces or changes a number.
 */
import type { SectorScore } from "./types";

export const EVENT_LABEL: Record<string, string> = {
  profit_warning: "peringatan laba",
  divestment: "divestasi",
  acquisition: "akuisisi",
  regulatory: "isu regulasi/hukum",
  export_policy: "kebijakan ekspor",
  capital_raise: "penggalangan modal",
  dividend: "dividen",
};

const bare = (t: string) => t.replace(/\.(SI|JK)$/, "");
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

/** The facts the brief may use, top sectors first. Compact on purpose: this is the whole prompt payload. */
export function briefFacts(sectors: SectorScore[], top = 3) {
  return sectors.slice(0, top).map((s) => ({
    rank: s.rank,
    sector: s.name,
    attention: +s.attention.toFixed(3),
    exposure: +s.exposure.score.toFixed(3),
    strongestLinks: s.exposure.links.slice(0, 2).map((l) => `${bare(l.sgxEntity)}→${l.idxSymbol ? bare(l.idxSymbol) : "operasi di Indonesia"} (${l.relation})`),
    sensitivitySignificant: s.sensitivity.significant,
    beta: s.sensitivity.beta === null ? null : +s.sensitivity.beta.toFixed(3),
    flow: { net: s.flow.score > 0 ? "beli" : s.flow.score < 0 ? "jual" : "netral", transactions: s.flow.count },
    events: s.trigger.events.slice(0, 3).map((e) => ({ type: EVENT_LABEL[e.type] ?? e.type, entity: bare(e.entity), direction: e.direction })),
    confidence: s.confidence.latest === null ? null : +s.confidence.latest.toFixed(2),
  }));
}

export function templateBrief(sectors: SectorScore[]): string {
  const top = sectors.slice(0, 3).filter((s) => s.attention > 0);
  if (!top.length) return "Belum ada sektor dengan keterkaitan SGX dan pemicu yang cukup untuk diperhatikan hari ini.";
  const parts = top.map((s) => {
    const why: string[] = [`eksposur ${pct(s.exposure.score)}`];
    const ev = s.trigger.events[0];
    if (ev) why.push(`${EVENT_LABEL[ev.type] ?? ev.type} dari ${bare(ev.entity)}`);
    if (s.flow.count) why.push(`${s.flow.count} transaksi orang dalam (${s.flow.score >= 0 ? "neto beli" : "neto jual"})`);
    if (!s.sensitivity.significant) why.push("tanpa bukti sensitivitas historis");
    return `${s.name} (${why.join(", ")})`;
  });
  return `Sektor yang paling layak dicek pagi ini: ${parts.join("; ")}. Ini skor perhatian, bukan saran beli atau jual.`;
}
