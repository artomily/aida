/**
 * Daily closes. The per-symbol endpoints cap each call at 90 days, so history is paginated in
 * 90-day windows, oldest first. A window that ended before today can never change, so it is
 * cached forever — re-running a backfill costs nothing for windows already on disk.
 */
import { STI } from "../scoring/series";
import type { Market, PriceRow } from "../scoring/types";
import { DAY, FOREVER, HOURLY, allPages, get, isoDate, num } from "./client";

const WINDOW_DAYS = 90;

export type Window = { start: string; end: string };

/** Contiguous windows of ≤90 calendar days covering [from, to]. */
export function windows(from: string, to: string): Window[] {
  const out: Window[] = [];
  let start = new Date(from + "T00:00:00Z");
  const last = new Date(to + "T00:00:00Z");
  while (start <= last) {
    const end = new Date(Math.min(start.getTime() + (WINDOW_DAYS - 1) * 86_400_000, last.getTime()));
    out.push({ start: isoDate(start), end: isoDate(end) });
    start = new Date(end.getTime() + 86_400_000);
  }
  return out;
}

const bare = (s: string) => s.replace(/\.(JK|SI)$/i, "");
const marketOf = (symbol: string): Market => (/\.SI$/i.test(symbol) ? "SGX" : "IDX");

type DailyRow = { date: string; close?: number | string | null; price?: number | string | null };

/** One ≤90-day window for one symbol; STI comes from the index endpoint. */
export async function fetchWindow(symbol: string, w: Window, today = isoDate(new Date())): Promise<PriceRow[]> {
  const apiPath =
    symbol === STI ? "/index-daily/sti/" : marketOf(symbol) === "SGX" ? `/sgx/daily/${bare(symbol)}/` : `/daily/${bare(symbol)}/`;
  const rows = await get<DailyRow[] | { results?: DailyRow[] }>(apiPath, { start: w.start, end: w.end }, w.end < today ? FOREVER : HOURLY);
  return (Array.isArray(rows) ? rows : (rows.results ?? []))
    .map((r) => ({ date: r.date.slice(0, 10), symbol, market: marketOf(symbol), close: num(r.close ?? r.price) ?? 0 }))
    .filter((r) => r.close > 0);
}

export async function fetchHistory(symbol: string, from: string, to: string): Promise<PriceRow[]> {
  const out: PriceRow[] = [];
  for (const w of windows(from, to)) out.push(...(await fetchWindow(symbol, w)));
  return out;
}

/**
 * Every IDX close for one day in one paginated feed (~32 credits). Cheaper than per-symbol
 * calls once more than ~32 symbols are needed for a single day.
 */
export async function fetchIdxCloses(date: string): Promise<PriceRow[]> {
  const rows = await allPages<{ symbol: string; date: string; close: number }>("/close/", { date }, 30, DAY, 60);
  return rows
    .map((r) => {
      const symbol = r.symbol.toUpperCase().endsWith(".JK") ? r.symbol.toUpperCase() : r.symbol.toUpperCase() + ".JK";
      return { date: r.date.slice(0, 10), symbol, market: "IDX" as const, close: num(r.close) ?? 0 };
    })
    .filter((r) => r.close > 0);
}

/** Estimated calls for a history pull, before running it. */
export const historyCalls = (symbols: number, from: string, to: string) => symbols * windows(from, to).length;
