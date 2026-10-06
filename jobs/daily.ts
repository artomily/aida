/**
 * The daily pipeline. One run before the IDX open (the cron fires 05:00–05:59 WIB) takes the
 * previous session's closes, overnight news and filings, and writes the snapshot users read
 * from 06:00. Each stage is idempotent and safe to re-run; the admin page can run them one by
 * one.
 *
 *   sgx    — SGX closes for linked entities + STI
 *   news   — SGX news for linked entities + IDX ownership filings
 *   score  — IDX closes → scores → daily_snapshot
 *
 * sectors.app prices are end-of-day, so the snapshot always scores the previous session.
 */
import { isMock, UpstreamError } from "../ingest/client";
import { loadControls } from "../ingest/controls";
import { fetchSgxNews } from "../ingest/news";
import { fetchFilings } from "../ingest/ownership";
import { fetchHistory, fetchIdxCloses } from "../ingest/prices";
import { fetchCompanies } from "../ingest/universe";
import { SECTORS } from "../scoring/sectors";
import { STI, buildSeries, constituents, sgxSymbols } from "../scoring/series";
import { buildSnapshot } from "../scoring/snapshot";
import type { Company, PriceRow, Snapshot } from "../scoring/types";
import type { NewsEventRow, SectorIndexRow, Store } from "../db/store";
import { composeBrief } from "./brief";
import { type Ctx, HISTORY_DAYS, TOP_N, daysAgo, log, nextDay, todayWib } from "./context";
import { runWeeklyBeta } from "./weekly-beta";

/** A symbol the daily run has never seen gets one 90-day window; deeper history is the backfill's job. */
const NEW_SYMBOL_DAYS = 89;

export type Progress = { complete: boolean; done: number; total: number; rows: number };

/**
 * Bring each symbol's stored closes to cover [from, to]: forward from its last close, and —
 * with `fillBack` — backward from its first close when that is later than `from`. Whole
 * symbols are written at once, so stopping at `deadline` loses nothing; the next call resumes.
 */
export async function catchUpPrices(
  store: Store,
  symbols: string[],
  from: string,
  to: string,
  job: string,
  opts: { fillBack?: boolean; deadline?: number } = {},
): Promise<Progress> {
  const coverage = new Map((await store.priceCoverage()).map((c) => [c.symbol, c]));
  let rows = 0;
  let done = 0;
  const missing: string[] = [];
  for (const symbol of symbols) {
    if (opts.deadline && Date.now() > opts.deadline) break;
    const c = coverage.get(symbol);
    const ranges: [string, string][] = !c
      ? [[from, to]]
      : [
          ...(opts.fillBack && c.first > nextDay(daysAgo(from, -6)) ? [[from, daysAgo(c.first, 1)] as [string, string]] : []),
          ...(nextDay(c.last) <= to ? [[nextDay(c.last), to] as [string, string]] : []),
        ];
    try {
      for (const [a, b] of ranges) {
        const got = await fetchHistory(symbol, a, b);
        await store.putPrices(got);
        rows += got.length;
      }
    } catch (e) {
      // A delisted or renamed symbol must not stop the rest; it still costs a credit per run.
      if (!(e instanceof UpstreamError && e.status === 404)) throw e;
      missing.push(symbol);
    }
    done++;
  }
  if (missing.length) log(job, `not found upstream, skipped: ${missing.join(", ")}`);
  log(job, `${done}/${symbols.length} symbols current, ${rows} new closes`);
  return { complete: done === symbols.length, done, total: symbols.length, rows };
}

export async function ensureCompanies(ctx: Ctx, job: string): Promise<Company[]> {
  const have = await ctx.store.getCompanies();
  if (have.some((c) => c.market === "IDX") && have.some((c) => c.market === "SGX")) return have;
  log(job, "no company universe stored yet — fetching screeners");
  const fresh = [...(await fetchCompanies("IDX")), ...(await fetchCompanies("SGX"))];
  await ctx.store.putCompanies(fresh);
  return fresh;
}

export const idxMembers = (companies: Company[], topN = TOP_N) =>
  [...constituents(companies, topN).values()].flat().map((c) => c.symbol);

/* ── sgx ── */

export async function runSgxIngest(ctx: Ctx, asOf = todayWib(), deadline?: number) {
  await ctx.store.putRelationships(ctx.graph);
  // The newest SGX close before the IDX open is the previous session's.
  return catchUpPrices(ctx.store, sgxSymbols(ctx.graph), daysAgo(asOf, NEW_SYMBOL_DAYS), daysAgo(asOf, 1), "sgx", { deadline });
}

/* ── news ── */

export async function runNewsIngest(ctx: Ctx, asOf = todayWib()) {
  const linked = sgxSymbols(ctx.graph).filter((s) => s !== STI);
  const news = await fetchSgxNews(linked, daysAgo(asOf, 7));
  await ctx.store.putNews(news);

  const last = await ctx.store.lastOwnershipDate();
  // Re-read the last two days: filings land late and ids make the upsert idempotent.
  const since = last ? daysAgo(last.slice(0, 10), 2) : daysAgo(asOf, 60);
  const filings = await fetchFilings(since);
  await ctx.store.putOwnership(filings);
  log("news", `${news.length} SGX articles, ${filings.length} ownership filings since ${since}`);
  return { news: news.length, filings: filings.length };
}

/* ── score ── */

function weekdaysAfter(from: string, to: string) {
  const out: string[] = [];
  for (let d = nextDay(from); d <= to; d = nextDay(d)) {
    const w = new Date(d + "T00:00:00Z").getUTCDay();
    if (w !== 0 && w !== 6) out.push(d);
  }
  return out;
}

/**
 * Per-symbol windows cost one call per symbol however many days are missing; the universe
 * feed costs ~32 calls per day. Take whichever is cheaper for the gap at hand.
 */
async function catchUpIdx(ctx: Ctx, symbols: string[], to: string, deadline?: number): Promise<Progress> {
  const last = await ctx.store.lastPriceDates();
  const known = symbols.map((s) => last.get(s));
  if (known.every(Boolean)) {
    const days = weekdaysAfter(known.sort()[0]!, to);
    if (days.length * 32 < symbols.length) {
      for (const d of days) await ctx.store.putPrices((await fetchIdxCloses(d)).filter((r) => symbols.includes(r.symbol)));
      log("score", days.length ? `IDX universe close for ${days.length} day(s)` : "IDX closes already current");
      return { complete: true, done: symbols.length, total: symbols.length, rows: 0 };
    }
  }
  return catchUpPrices(ctx.store, symbols, daysAgo(to, NEW_SYMBOL_DAYS), to, "score", { deadline });
}

export async function runScore(ctx: Ctx, asOf = todayWib(), deadline?: number): Promise<Snapshot> {
  const companies = await ensureCompanies(ctx, "score");
  await catchUpIdx(ctx, idxMembers(companies), daysAgo(asOf, 1), deadline);

  const from = daysAgo(asOf, HISTORY_DAYS);
  const controls = loadControls();
  if (controls.length) await ctx.store.putControls(controls);

  const [prices, storedControls, news, ownership, betas] = await Promise.all([
    ctx.store.getPrices(from),
    ctx.store.getControls(from),
    ctx.store.getNews(daysAgo(asOf, 7)),
    ctx.store.getOwnership(daysAgo(asOf, 60)),
    ctx.store.getLatestBetas(),
  ]);

  // Betas refresh weekly; the very first run estimates them on the spot.
  const sensitivity = betas?.results ?? (await runWeeklyBeta(ctx, asOf, { companies, prices, controls: storedControls }));

  const base = buildSnapshot({
    asOf,
    mode: isMock() ? "mock" : "live",
    companies,
    prices,
    controls: storedControls,
    news,
    ownership,
    graph: ctx.graph,
    aliases: ctx.aliases,
    taxonomy: ctx.taxonomy,
    topN: TOP_N,
    sensitivity,
  });
  if (betas) base.notes.push(`Beta dari estimasi mingguan ${betas.asOf}.`);
  const snapshot: Snapshot = { ...base, brief: await composeBrief(base.sectors) };

  await ctx.store.putSnapshot(snapshot);
  await ctx.store.putNewsEvents(newsEvents(snapshot));
  await ctx.store.putSectorIndex(sectorIndexRows(companies, prices, ctx, asOf));
  log("score", `snapshot ${asOf} written (${snapshot.sectors.filter((s) => s.attention > 0).length} sectors with attention > 0)`);
  return snapshot;
}

function newsEvents(s: Snapshot): NewsEventRow[] {
  return s.sectors.flatMap((sec) =>
    sec.trigger.events.map((e) => ({
      id: `${e.newsId}|${e.type}|${sec.slug}`,
      newsId: e.newsId,
      publishedAt: e.publishedAt,
      sgxEntity: e.entity,
      sector: sec.slug,
      eventType: e.type,
      direction: e.direction,
      materiality: e.materiality,
    })),
  );
}

/** The derived sector series, stored for inspection — the last ~30 sessions per run. */
function sectorIndexRows(companies: Company[], prices: PriceRow[], ctx: Ctx, asOf: string): SectorIndexRow[] {
  const series = buildSeries(companies, prices, [], ctx.graph, TOP_N);
  const since = daysAgo(asOf, 45);
  return SECTORS.flatMap(({ slug }) => [
    ...[...series.idx.get(slug)!].filter(([d]) => d >= since).map(([date, r]) => ({ date, sector: slug, market: "IDX" as const, return: r })),
    ...[...series.sgx.get(slug)!.series]
      .filter(([d]) => d >= since)
      .map(([date, r]) => ({ date, sector: slug, market: "SGX" as const, return: r })),
  ]);
}

export type Stage = "sgx" | "news" | "score" | "pipeline";

/** Run one stage, or the whole morning pipeline. Returns a one-line summary for the run log. */
export async function runDaily(ctx: Ctx, stage: Stage, asOf = todayWib(), deadline?: number): Promise<string> {
  const parts: string[] = [];
  if (stage === "sgx" || stage === "pipeline") {
    const p = await runSgxIngest(ctx, asOf, deadline);
    parts.push(`SGX ${p.done}/${p.total} simbol, ${p.rows} close baru`);
  }
  if (stage === "news" || stage === "pipeline") {
    const n = await runNewsIngest(ctx, asOf);
    parts.push(`${n.news} berita SGX, ${n.filings} filing`);
  }
  if (stage === "score" || stage === "pipeline") {
    const s = await runScore(ctx, asOf, deadline);
    parts.push(`snapshot ${s.date} (${s.validation.history.days} hari riwayat)`);
  }
  return parts.join(" · ");
}
