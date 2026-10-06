/**
 * Postgres implementation of the store. Production uses Neon's HTTP driver; the same code runs
 * against PGlite in `scripts/db-check.ts`, which is how the SQL is exercised without a server.
 * No interactive transactions — the Neon HTTP driver doesn't support them, and every write
 * here is an idempotent upsert anyway.
 */
import { neon } from "@neondatabase/serverless";
import { count, desc, eq, gte, max, min, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { SectorSlug } from "../scoring/sectors";
import type { ControlSeries, Market, SensitivityResult, Snapshot } from "../scoring/types";
import * as t from "./schema";
import type { JobRun, Store } from "./store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof t>;

/** Upsert in chunks: Postgres caps a statement at 65,535 bind parameters. */
async function chunked<T>(rows: T[], size: number, write: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await write(rows.slice(i, i + size));
}

const excluded = (col: string) => sql.raw(`excluded."${col}"`);

const CONTROL_COLUMN: Record<ControlSeries, keyof typeof t.controlsDaily.$inferInsert> = {
  spx_fut: "spxFut",
  usdidr: "usdidr",
  hsi: "hsi",
  coal: "coal",
  cpo: "cpo",
};
const CONTROL_SQL: Record<ControlSeries, string> = { spx_fut: "spx_fut", usdidr: "usdidr", hsi: "hsi", coal: "coal", cpo: "cpo" };

export function pgStore(db: Db): Store {
  return {
    kind: "postgres",

    async putCompanies(rows) {
      await chunked(rows, 1000, (c) =>
        db
          .insert(t.companies)
          .values(c.map((r) => ({ symbol: r.symbol, name: r.name, market: r.market, sectorSlug: r.sector, subSector: r.subSector ?? null, marketCap: r.marketCap })))
          .onConflictDoUpdate({
            target: t.companies.symbol,
            set: {
              name: excluded("name"),
              market: excluded("market"),
              sectorSlug: excluded("sector_slug"),
              subSector: excluded("sub_sector"),
              marketCap: excluded("market_cap"),
              updatedAt: sql`now()`,
            },
          }),
      );
    },
    async getCompanies() {
      const rows = await db.select().from(t.companies);
      return rows.map((r) => ({
        symbol: r.symbol,
        name: r.name,
        market: r.market as Market,
        sector: r.sectorSlug as SectorSlug | null,
        subSector: r.subSector,
        marketCap: r.marketCap,
      }));
    },

    async putRelationships(graph) {
      // The YAML is the source of truth: replace the table wholesale.
      await db.delete(t.relationships);
      const rows = graph.relationships.map((r) => ({
        id: `${r.sgxEntity}>${r.idxSymbol ?? r.sector}`,
        sgxEntity: r.sgxEntity,
        idxSymbol: r.idxSymbol,
        sectorSlug: r.sector,
        relationType: r.relation,
        weight: graph.relationWeights[r.relation],
        via: r.via,
        source: r.source,
        verified: r.verified,
      }));
      if (rows.length) await db.insert(t.relationships).values(rows).onConflictDoNothing();
    },

    async putPrices(rows) {
      await chunked(rows, 2000, (c) =>
        db
          .insert(t.pricesDaily)
          .values(c.map((r) => ({ date: r.date, symbol: r.symbol, market: r.market, close: r.close })))
          .onConflictDoUpdate({ target: [t.pricesDaily.date, t.pricesDaily.symbol], set: { close: excluded("close") } }),
      );
    },
    async getPrices(from) {
      const rows = await db
        .select({ date: t.pricesDaily.date, symbol: t.pricesDaily.symbol, market: t.pricesDaily.market, close: t.pricesDaily.close })
        .from(t.pricesDaily)
        .where(gte(t.pricesDaily.date, from));
      return rows.map((r) => ({ ...r, market: r.market as Market }));
    },
    async lastPriceDates() {
      const rows = await db
        .select({ symbol: t.pricesDaily.symbol, last: max(t.pricesDaily.date) })
        .from(t.pricesDaily)
        .groupBy(t.pricesDaily.symbol);
      return new Map(rows.filter((r) => r.last).map((r) => [r.symbol, r.last!]));
    },

    async priceCoverage() {
      const rows = await db
        .select({
          symbol: t.pricesDaily.symbol,
          market: t.pricesDaily.market,
          first: min(t.pricesDaily.date),
          last: max(t.pricesDaily.date),
          rows: count(),
        })
        .from(t.pricesDaily)
        .groupBy(t.pricesDaily.symbol, t.pricesDaily.market);
      return rows.map((r) => ({ symbol: r.symbol, market: r.market as Market, first: r.first!, last: r.last!, rows: r.rows }));
    },

    async putSectorIndex(rows) {
      await chunked(rows, 3000, (c) =>
        db
          .insert(t.sectorIndex)
          .values(c.map((r) => ({ date: r.date, sectorSlug: r.sector, market: r.market, return: r.return })))
          .onConflictDoUpdate({
            target: [t.sectorIndex.date, t.sectorIndex.sectorSlug, t.sectorIndex.market],
            set: { return: excluded("return") },
          }),
      );
    },

    async putControls(rows) {
      for (const [series, list] of Map.groupBy(rows, (r) => r.series)) {
        const col = CONTROL_COLUMN[series];
        await chunked(list, 3000, (c) =>
          db
            .insert(t.controlsDaily)
            .values(c.map((r) => ({ date: r.date, [col]: r.value })))
            .onConflictDoUpdate({ target: t.controlsDaily.date, set: { [col]: excluded(CONTROL_SQL[series]) } }),
        );
      }
    },
    async getControls(from) {
      const rows = await db.select().from(t.controlsDaily).where(gte(t.controlsDaily.date, from));
      return rows.flatMap((r) =>
        (Object.keys(CONTROL_COLUMN) as ControlSeries[])
          .map((series) => ({ date: r.date, series, value: r[CONTROL_COLUMN[series] as "hsi"] }))
          .filter((x): x is { date: string; series: ControlSeries; value: number } => x.value != null),
      );
    },

    async putNews(items) {
      await chunked(items, 500, (c) =>
        db
          .insert(t.newsRaw)
          .values(c.map((n) => ({ id: n.id, publishedAt: n.publishedAt, title: n.title, body: n.body, symbols: n.symbols, url: n.url })))
          .onConflictDoNothing(),
      );
    },
    async getNews(since) {
      const rows = await db.select().from(t.newsRaw).where(gte(t.newsRaw.publishedAt, since));
      return rows.map((r) => ({ id: r.id, publishedAt: r.publishedAt, title: r.title, body: r.body, symbols: r.symbols, url: r.url }));
    },
    async putNewsEvents(rows) {
      await chunked(rows, 1000, (c) =>
        db
          .insert(t.newsEvents)
          .values(c.map(({ sector, ...r }) => ({ ...r, sectorSlug: sector })))
          .onConflictDoNothing(),
      );
    },

    async putOwnership(rows) {
      await chunked(rows, 800, (c) =>
        db
          .insert(t.ownershipTx)
          .values(
            c.map((r) => ({
              id: r.id,
              date: r.date,
              symbol: r.symbol,
              sectorSlug: r.sector,
              holderName: r.holderName,
              holderType: r.holderType,
              txType: r.txType,
              value: r.value,
              pctChange: r.pctChange,
              tags: r.tags,
            })),
          )
          .onConflictDoNothing(),
      );
    },
    async getOwnership(since) {
      const rows = await db.select().from(t.ownershipTx).where(gte(t.ownershipTx.date, since));
      return rows.map((r) => ({
        id: r.id,
        date: r.date,
        symbol: r.symbol,
        sector: r.sectorSlug as SectorSlug | null,
        holderName: r.holderName,
        holderType: r.holderType,
        txType: r.txType as "buy" | "sell" | "others",
        value: r.value,
        pctChange: r.pctChange,
        tags: r.tags,
      }));
    },
    async lastOwnershipDate() {
      const [row] = await db.select({ last: max(t.ownershipTx.date) }).from(t.ownershipTx);
      return row?.last ?? null;
    },

    async putBetas(asOf, results) {
      const rows = [...results].map(([slug, r]) => ({
        sectorSlug: slug,
        asOf,
        result: r,
        beta: r.beta,
        pValue: r.pValue,
        pAdjusted: r.pAdjusted,
        stability: r.stability,
        r2: r.r2,
      }));
      await db
        .insert(t.betaEstimates)
        .values(rows)
        .onConflictDoUpdate({
          target: [t.betaEstimates.sectorSlug, t.betaEstimates.asOf],
          set: {
            result: excluded("result"),
            beta: excluded("beta"),
            pValue: excluded("p_value"),
            pAdjusted: excluded("p_adjusted"),
            stability: excluded("stability"),
            r2: excluded("r2"),
          },
        });
    },
    async getLatestBetas() {
      const [latest] = await db.select({ asOf: max(t.betaEstimates.asOf) }).from(t.betaEstimates);
      if (!latest?.asOf) return null;
      const rows = await db.select().from(t.betaEstimates).where(eq(t.betaEstimates.asOf, latest.asOf));
      return {
        asOf: latest.asOf,
        results: new Map(rows.map((r) => [r.sectorSlug as SectorSlug, r.result as SensitivityResult])),
      };
    },

    async putSnapshot(snapshot) {
      await db
        .insert(t.dailySnapshot)
        .values({ date: snapshot.date, payload: snapshot })
        .onConflictDoUpdate({ target: t.dailySnapshot.date, set: { payload: excluded("payload") } });
    },
    async putJobRun(run) {
      await db
        .insert(t.jobRuns)
        .values(run)
        .onConflictDoUpdate({
          target: t.jobRuns.id,
          set: { finishedAt: excluded("finished_at"), status: excluded("status"), upstreamCalls: excluded("upstream_calls"), message: excluded("message") },
        });
    },
    async listJobRuns(limit) {
      const rows = await db.select().from(t.jobRuns).orderBy(desc(t.jobRuns.startedAt)).limit(limit);
      return rows as JobRun[];
    },

    async getSnapshot(date) {
      const [row] = date
        ? await db.select().from(t.dailySnapshot).where(eq(t.dailySnapshot.date, date)).limit(1)
        : await db.select().from(t.dailySnapshot).orderBy(desc(t.dailySnapshot.date)).limit(1);
      return (row?.payload as Snapshot | undefined) ?? null;
    },
  };
}

export const neonStore = (url: string) => pgStore(drizzle(neon(url), { schema: t }) as unknown as Db);
