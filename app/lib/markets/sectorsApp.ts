/**
 * sectors.app v2 client — server only (reads SECTORS_API_KEY).
 * Docs: https://docs.sectors.app (v1 was discontinued 2026-05-11).
 *
 * Credit budget per refresh, at the cache windows below:
 *   universe  ≈ 5 pages IDX + 3 pages SGX @ limit 200  → ~8 credits / hour
 *   news      ≈ 2 pages each exchange @ limit 30       → ~4 credits / hour (+1 per symbol-filtered call)
 *   links     3 report sections per IDX emiten (daily), 90-day closes (12 h), mining trees (weekly)
 *
 * Nothing refreshes faster than HOURLY: prices are end-of-day anyway, and every upstream call
 * bills a credit. `revalidate` is stale-while-revalidate, so at most one refetch per window
 * no matter how many readers poll the /api/markets routes.
 */
import { memo } from "./memo";
import { toSectorSlug } from "./sectors";
import type { Exchange, NewsItem, Sentiment, Stock } from "./types";

// Overridable so a local mock can stand in for the real API when measuring call volume.
const BASE = process.env.SECTORS_API_BASE ?? "https://api.sectors.app/v2";

/** Shortest cache window for any sectors.app call, in seconds. */
export const HOURLY = 3600;

export const hasSectorsKey = () => Boolean(process.env.SECTORS_API_KEY);

export class SectorsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/*
 * Hard ceiling on upstream calls per rolling hour. A runaway loop or a cache that stops working
 * then costs at most this many credits before the app degrades to sample data, instead of 30k.
 */
const MAX_CALLS_PER_HOUR = Number(process.env.SECTORS_MAX_CALLS_PER_HOUR ?? 400);
const gb = globalThis as typeof globalThis & { __sectorsCalls?: number[] };
const calls = (gb.__sectorsCalls ??= []);

function spend(path: string) {
  const cutoff = Date.now() - 3_600_000;
  while (calls.length && calls[0] < cutoff) calls.shift();
  if (calls.length >= MAX_CALLS_PER_HOUR)
    throw new SectorsError(429, `budget: ${MAX_CALLS_PER_HOUR} sectors.app calls/hour reached, skipped ${path}`);
  calls.push(Date.now());
}

/** Upstream calls made in the last hour — surfaced in /api/markets/usage. */
export function usage() {
  const cutoff = Date.now() - 3_600_000;
  return { lastHour: calls.filter((t) => t >= cutoff).length, maxPerHour: MAX_CALLS_PER_HOUR };
}

async function get<T>(path: string, params: Record<string, string | number | undefined>, revalidate: number): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  // The in-process memo is the real guard; Next's fetch cache stays underneath to survive restarts.
  return memo(url.toString(), revalidate * 1000, async () => {
    spend(path);
    const res = await fetch(url, {
      headers: { Authorization: process.env.SECTORS_API_KEY ?? "" },
      next: { revalidate, tags: ["sectors"] },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new SectorsError(res.status, `sectors.app ${res.status} ${path}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  });
}

type Page<T> = {
  results: T[];
  pagination?: { has_next: boolean; next_offset: number | null };
};

async function allPages<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  limit: number,
  revalidate: number,
  maxPages: number,
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (let i = 0; i < maxPages; i++) {
    const page = await get<Page<T>>(path, { ...params, limit, offset }, revalidate);
    out.push(...(page.results ?? []));
    if (!page.pagination?.has_next || page.pagination.next_offset == null) break;
    offset = page.pagination.next_offset;
  }
  return out;
}

/* ── universe ── */

type ScreenerRow = {
  symbol: string;
  company_name: string;
  query_values?: Record<string, unknown>;
} & Record<string, unknown>;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && !isNaN(+v) ? +v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/*
 * The screener only echoes fields referenced in `where` / `order_by` inside `query_values`,
 * so every field we want to read is named in the filter (as IS NOT NULL / > 0).
 */
const IDX_WHERE =
  "market_cap > 0 and sector IS NOT NULL and sub_sector IS NOT NULL and last_close_price > 0 and daily_close_change IS NOT NULL";
const SGX_WHERE =
  "market_cap > 0 and sector IS NOT NULL and sub_sector IS NOT NULL and last_close_price > 0 and change_1d IS NOT NULL";

function toStock(r: ScreenerRow, exchange: Exchange): Stock | null {
  const q = { ...r, ...(r.query_values ?? {}) };
  const sector = toSectorSlug(str(q.sector), str(q.sub_sector));
  if (!sector) return null;
  return {
    symbol: r.symbol.toUpperCase(),
    name: r.company_name,
    exchange,
    sector,
    subSector: str(q.sub_sector),
    marketCap: num(q.market_cap),
    price: num(q.last_close_price),
    change: num(exchange === "IDX" ? q.daily_close_change : q.change_1d),
  };
}

export async function fetchUniverse(exchange: Exchange): Promise<Stock[]> {
  const path = exchange === "IDX" ? "/companies/" : "/sgx/companies/";
  const rows = await allPages<ScreenerRow>(
    path,
    { where: exchange === "IDX" ? IDX_WHERE : SGX_WHERE, order_by: "-market_cap", include_query_values: "true" },
    200,
    HOURLY,
    exchange === "IDX" ? 6 : 4,
  );
  return rows.map((r) => toStock(r, exchange)).filter((s): s is Stock => s !== null);
}

/* ── news ── */

type NewsRow = {
  title: string;
  body?: string;
  source?: string;
  timestamp: string;
  symbols?: string[];
  sector?: string | null;
  sub_sector?: string[] | string | null;
  tags?: string[];
};

const RISK_TAG = /violation|risk|compliance|legal|lawsuit|litigation|fraud|default|restructur|bankrupt|suspen|downgrade|governance|investigat|management change|resign/i;
const RISK_WORD =
  /gugatan|gagal bayar|pailit|pkpu|suspensi|investigasi|penyidikan|penyelidikan|korupsi|mengundurkan diri|resign|probe|lawsuit|fraud|default|downgrade|restructur|delist/i;

function sentimentOf(tags: string[]): Sentiment {
  const t = tags.join(" ").toLowerCase();
  if (t.includes("bearish")) return "bearish";
  if (t.includes("bullish")) return "bullish";
  return "neutral";
}

function toNews(r: NewsRow, exchange: Exchange, i: number): NewsItem {
  const tags = r.tags ?? [];
  const sub = Array.isArray(r.sub_sector) ? r.sub_sector : r.sub_sector ? [r.sub_sector] : [];
  return {
    id: `${exchange}:${r.timestamp}:${i}:${r.title.slice(0, 24)}`,
    exchange,
    title: r.title.trim(),
    summary: (r.body ?? "").trim(),
    url: r.source ?? null,
    timestamp: r.timestamp,
    symbols: (r.symbols ?? []).map((s) => s.toUpperCase()),
    sector: toSectorSlug(r.sector, ...sub),
    tags,
    sentiment: sentimentOf(tags),
    risk: tags.some((t) => RISK_TAG.test(t)) || RISK_WORD.test(r.title),
  };
}

/** Latest news for one exchange, optionally narrowed to symbols (bare or suffixed). */
export async function fetchNews(
  exchange: Exchange,
  opts: { symbols?: string[]; start?: string; pages?: number; revalidate?: number } = {},
): Promise<NewsItem[]> {
  const path = exchange === "IDX" ? "/news/" : "/sgx/news/";
  const symbols = opts.symbols?.map((s) => s.replace(/\.(JK|SI)$/i, "")).join(",");
  const rows = await allPages<NewsRow>(
    path,
    { symbols, start: opts.start, extension: exchange === "IDX" ? "idx" : undefined },
    30,
    opts.revalidate ?? HOURLY,
    opts.pages ?? 2,
  );
  return rows.map((r, i) => toNews(r, exchange, i));
}

/* ── ownership & prices for the link graph ── */

export type Ownership = {
  symbol: string;
  majorShareholders: { name: string; share: number | null }[];
  groups: string[];
  affiliates: string[];
  executives: { name: string; position: string }[];
};

type ReportRow = {
  symbol: string;
  overview?: { affiliates?: string[] | null };
  management?: { key_executives?: { name: string; position: string }[] | null };
  ownership?: {
    major_shareholders?: { name: string; share_percentage?: string | number | null }[] | null;
    conglomerates_group?: string[] | null;
  };
};

/** 3 credits (overview, management, ownership); cached a day — ownership moves slowly. */
export async function fetchOwnership(idxSymbol: string): Promise<Ownership> {
  const bare = idxSymbol.replace(/\.JK$/i, "");
  const r = await get<ReportRow>(`/company/report/${bare}/`, { sections: "overview,management,ownership" }, 86400);
  return {
    symbol: idxSymbol.toUpperCase(),
    majorShareholders: (r.ownership?.major_shareholders ?? []).map((m) => ({
      name: m.name,
      share: num(m.share_percentage),
    })),
    groups: r.ownership?.conglomerates_group ?? [],
    affiliates: r.overview?.affiliates ?? [],
    executives: r.management?.key_executives ?? [],
  };
}

type DailyRow = { date: string; close: number };

/** Up to 90 days of closes (the endpoint's window cap). */
export async function fetchCloses(symbol: string, days = 90): Promise<DailyRow[]> {
  const sgx = /\.SI$/i.test(symbol);
  const bare = symbol.replace(/\.(JK|SI)$/i, "");
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const rows = await get<DailyRow[] | { results: DailyRow[] }>(
    sgx ? `/sgx/daily/${bare}/` : `/daily/${bare}/`,
    { start: d(start), end: d(end) },
    43200,
  );
  return (Array.isArray(rows) ? rows : (rows.results ?? [])).map((r) => ({ date: r.date, close: +r.close }));
}

/* ── mining ownership tree (parents / subsidiaries) ── */

export type OwnershipNode = { name: string; slug: string; symbol: string | null; stake: number | null };
export type MiningTree = { slug: string; parents: OwnershipNode[]; subsidiaries: OwnershipNode[] };

type MiningListRow = { slug: string; name: string; symbol: string | null };
type MiningTreeRow = {
  slug: string;
  parents?: { name: string; slug: string; symbol?: string | null; percentage_ownership?: number | null }[] | null;
  subsidiaries?: { name: string; slug: string; symbol?: string | null; percentage_ownership?: number | null }[] | null;
};

const node = (r: { name: string; slug: string; symbol?: string | null; percentage_ownership?: number | null }): OwnershipNode => {
  const pct = num(r.percentage_ownership);
  return {
    name: r.name,
    slug: r.slug,
    symbol: r.symbol ? r.symbol.toUpperCase() : null,
    // The mining tree reports whole percents (15.37), unlike the report section's decimals.
    stake: pct === null ? null : pct > 1 ? pct / 100 : pct,
  };
};

/** Mining slug for an IDX symbol, or null when the emiten is not in the mining extension. */
export async function findMiningSlug(idxSymbol: string): Promise<string | null> {
  const bare = idxSymbol.replace(/\.JK$/i, "").toUpperCase();
  const page = await get<Page<MiningListRow>>("/mining/companies/", { keyword: bare, limit: 30 }, 604800);
  const hit = (page.results ?? []).find((r) => (r.symbol ?? "").replace(/\.JK$/i, "").toUpperCase() === bare);
  return hit?.slug ?? null;
}

/**
 * Parent / subsidiary tree with stakes — the only sectors.app endpoint that exposes a corporate
 * structure rather than a shareholder list, but it covers mining companies only. 2 credits
 * (slug lookup + tree), cached a week; structure changes far slower than ownership percentages.
 */
export async function fetchMiningTree(idxSymbol: string): Promise<MiningTree | null> {
  const slug = await findMiningSlug(idxSymbol);
  if (!slug) return null;
  const r = await get<MiningTreeRow>(`/mining/companies/ownership/${slug}/`, {}, 604800);
  return {
    slug: r.slug ?? slug,
    parents: (r.parents ?? []).map(node),
    subsidiaries: (r.subsidiaries ?? []).map(node),
  };
}
