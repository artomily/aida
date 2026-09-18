import type { CrossLink, LinkSensitivity, NewsItem } from "./types";

/**
 * Domino-effect maths. Pure functions only — shared by the server (sensitivity) and the
 * client (simulator, alerts), so both always agree.
 */

const MIN_DAYS = 20;

/**
 * Rough pass-through when there is not enough price history: control relationships pass
 * more of a shock than group ties. Deliberately conservative; flagged `days: 0` in the UI.
 */
export function stakeBeta(l: CrossLink): number {
  const base = { pengendali: 0.25, "anak-usaha": 0.3, "pemegang-saham": 0.15, grup: 0.12, sponsor: 0.2 }[l.relation];
  return +(base + 0.35 * (l.stake ?? 0.3)).toFixed(2);
}

type Close = { date: string; close: number };

/**
 * Beta of `to` on `from` from daily closes. SGX and IDX holidays differ, so only dates both
 * markets traded count, and each return spans the previous common date.
 */
export function betaFromCloses(from: Close[], to: Close[]): { beta: number; correlation: number; days: number } | null {
  const toMap = new Map(to.map((c) => [c.date, c.close]));
  const common = from
    .filter((c) => toMap.has(c.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => [c.close, toMap.get(c.date)!] as const);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 1; i < common.length; i++) {
    const [fx0, ty0] = common[i - 1];
    const [fx1, ty1] = common[i];
    if (fx0 > 0 && ty0 > 0) {
      xs.push(fx1 / fx0 - 1);
      ys.push(ty1 / ty0 - 1);
    }
  }
  if (xs.length < MIN_DAYS) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < xs.length; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  if (!vx || !vy) return null;
  return { beta: +(cov / vx).toFixed(3), correlation: +(cov / Math.sqrt(vx * vy)).toFixed(3), days: xs.length };
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

export type Impact = {
  symbol: string;
  /** Estimated move, same unit as the shock (percent). */
  impact: number;
  /** Symbols from the shocked node to this one. */
  path: string[];
};

/**
 * Push `shocks` (symbol → % move) down the link graph, up to `maxDepth` hops. Each hop
 * multiplies by that edge's beta; where several paths reach a node from one source the
 * strongest wins, and effects from different sources add up.
 */
export function propagate(
  shocks: Record<string, number>,
  links: CrossLink[],
  sensitivity: LinkSensitivity[],
  maxDepth = 3,
): Impact[] {
  const beta = new Map(sensitivity.map((s) => [s.linkId, s.beta]));
  const out = new Map<string, Impact>();

  for (const [source, shock] of Object.entries(shocks)) {
    if (!shock) continue;
    const best = new Map<string, Impact>();
    const walk = (node: string, value: number, path: string[]) => {
      if (path.length > maxDepth) return;
      for (const l of links) {
        if (l.from !== node || path.includes(l.to)) continue;
        const b = beta.get(l.id) ?? stakeBeta(l);
        const v = value * b;
        const next = [...path, l.to];
        const prev = best.get(l.to);
        if (!prev || Math.abs(v) > Math.abs(prev.impact)) best.set(l.to, { symbol: l.to, impact: v, path: next });
        walk(l.to, v, next);
      }
    };
    walk(source, shock, [source]);
    for (const imp of best.values()) {
      const acc = out.get(imp.symbol);
      out.set(imp.symbol, acc ? { ...acc, impact: acc.impact + imp.impact } : imp);
    }
  }
  return [...out.values()].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export type AlertLevel = "aman" | "waspada" | "tinggi";

export type UpstreamAlert = {
  level: AlertLevel;
  reasons: string[];
};

const RECENT_MS = 72 * 3600 * 1000;

/**
 * How worried to be about an upstream (usually SGX) company right now, from today's move and
 * risk-tagged news in the last 72 hours. Reasons are plain sentences for the card.
 */
export function upstreamAlert(
  change: number | null,
  news: NewsItem[],
  /** News from this exchange naming a board member of a linked emiten on the other one. */
  mentions: NewsItem[] = [],
  now = Date.now(),
): UpstreamAlert {
  const reasons: string[] = [];
  let score = 0;
  const pct = change === null ? null : change * 100;
  if (pct !== null && Math.abs(pct) >= 6) {
    score += 2;
    reasons.push(`Harga bergerak ${fmtPct(pct)} hari ini — sangat besar`);
  } else if (pct !== null && Math.abs(pct) >= 3) {
    score += 1;
    reasons.push(`Harga bergerak ${fmtPct(pct)} hari ini`);
  }
  const recent = news.filter((n) => now - Date.parse(n.timestamp) < RECENT_MS);
  const risky = recent.filter((n) => n.risk);
  const bearish = recent.filter((n) => n.sentiment === "bearish");
  if (risky.length) {
    score += risky.some((n) => n.sentiment === "bearish") ? 2 : 1;
    reasons.push(`${risky.length} berita bertanda risiko (hukum/tata kelola/keuangan) dalam 72 jam`);
  } else if (bearish.length >= 2) {
    score += 1;
    reasons.push(`${bearish.length} berita bernada negatif dalam 72 jam`);
  }
  const named = mentions.filter((n) => now - Date.parse(n.timestamp) < RECENT_MS);
  if (named.length) {
    score += named.some((n) => n.risk || n.sentiment === "bearish") ? 2 : 1;
    reasons.push(`${named.length} berita menyebut direksi/komisaris emiten IDX terkait`);
  }
  return { level: score >= 2 ? "tinggi" : score === 1 ? "waspada" : "aman", reasons };
}

export const fmtPct = (v: number, digits = 2) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(digits).replace(".", ",") + "%";
