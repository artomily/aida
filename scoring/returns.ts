/**
 * Daily return series built from stored closes. IDX-IC sector indices are not available
 * upstream, so each sector's return is the market-cap-weighted return of its largest
 * constituents; the SGX side is an exposure-weighted basket of linked entities.
 */
import type { PriceRow } from "./types";

export const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

/** date → return, ascending by date. */
export type Series = Map<string, number>;

/** Simple close-to-close returns per symbol, between consecutive stored trading days. */
export function symbolReturns(prices: PriceRow[]): Map<string, Series> {
  const bySymbol = new Map<string, PriceRow[]>();
  for (const p of prices) {
    if (!(p.close > 0)) continue;
    const list = bySymbol.get(p.symbol);
    if (list) list.push(p);
    else bySymbol.set(p.symbol, [p]);
  }
  const out = new Map<string, Series>();
  for (const [symbol, rows] of bySymbol) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const s: Series = new Map();
    for (let i = 1; i < rows.length; i++) s.set(rows[i].date, rows[i].close / rows[i - 1].close - 1);
    out.set(symbol, s);
  }
  return out;
}

/**
 * Weighted average return per date over whichever members traded that day. A date needs at
 * least `minCoverage` of the total weight present, so one illiquid name can't define the day.
 */
export function basketReturns(returns: Map<string, Series>, weights: Map<string, number>, minCoverage = 0.5): Series {
  const total = [...weights.values()].reduce((s, w) => s + w, 0);
  if (total <= 0) return new Map();
  const acc = new Map<string, { sum: number; w: number }>();
  for (const [symbol, w] of weights) {
    const s = returns.get(symbol);
    if (!s || w <= 0) continue;
    for (const [date, r] of s) {
      // Guard against bad ticks (splits the provider didn't adjust): a ±50% day is dropped.
      if (!Number.isFinite(r) || Math.abs(r) > 0.5) continue;
      const a = acc.get(date) ?? { sum: 0, w: 0 };
      a.sum += r * w;
      a.w += w;
      acc.set(date, a);
    }
  }
  const out: Series = new Map();
  for (const date of [...acc.keys()].sort()) {
    const a = acc.get(date)!;
    if (a.w / total >= minCoverage) out.set(date, a.sum / a.w);
  }
  return out;
}

/**
 * Pair y(t) with x(the last x-date strictly before t). Markets keep different holidays, so the
 * lag is "previous trading session of the other market", not "index minus one".
 */
export function alignLagged(y: Series, x: Series, maxGapDays = 7): { dates: string[]; y: number[]; x: number[] } {
  const xDates = [...x.keys()].sort();
  const out = { dates: [] as string[], y: [] as number[], x: [] as number[] };
  let j = -1;
  for (const date of [...y.keys()].sort()) {
    while (j + 1 < xDates.length && xDates[j + 1] < date) j++;
    // A gap in stored history must not pair today with a session weeks ago.
    if (j < 0 || daysBetween(xDates[j], date) > maxGapDays) continue;
    out.dates.push(date);
    out.y.push(y.get(date)!);
    out.x.push(x.get(xDates[j])!);
  }
  return out;
}
