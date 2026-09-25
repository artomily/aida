/**
 * Postgres schema (Neon in production). `daily_snapshot` is the only table the dashboard reads:
 * one row per day, the whole computed day as JSONB, one query per page load.
 */
import { boolean, date, doublePrecision, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const sectors = pgTable("sectors", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  gicsMapping: text("gics_mapping"),
  exposureScore: doublePrecision("exposure_score"),
});

export const companies = pgTable("companies", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  market: text("market").notNull(),
  sectorSlug: text("sector_slug"),
  marketCap: doublePrecision("market_cap"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).notNull().defaultNow(),
});

export const relationships = pgTable("relationships", {
  id: text("id").primaryKey(),
  sgxEntity: text("sgx_entity").notNull(),
  idxSymbol: text("idx_symbol"),
  sectorSlug: text("sector_slug").notNull(),
  relationType: text("relation_type").notNull(),
  weight: doublePrecision("weight").notNull(),
  via: text("via"),
  source: text("source").notNull(),
  verified: boolean("verified").notNull().default(false),
});

export const pricesDaily = pgTable(
  "prices_daily",
  {
    date: date("date", { mode: "string" }).notNull(),
    symbol: text("symbol").notNull(),
    market: text("market").notNull(),
    close: doublePrecision("close").notNull(),
    return: doublePrecision("return"),
  },
  (t) => [primaryKey({ columns: [t.date, t.symbol] })],
);

export const sectorIndex = pgTable(
  "sector_index",
  {
    date: date("date", { mode: "string" }).notNull(),
    sectorSlug: text("sector_slug").notNull(),
    market: text("market").notNull(),
    return: doublePrecision("return").notNull(),
  },
  (t) => [primaryKey({ columns: [t.date, t.sectorSlug, t.market] })],
);

export const controlsDaily = pgTable("controls_daily", {
  date: date("date", { mode: "string" }).primaryKey(),
  spxFut: doublePrecision("spx_fut"),
  usdidr: doublePrecision("usdidr"),
  hsi: doublePrecision("hsi"),
  coal: doublePrecision("coal"),
  cpo: doublePrecision("cpo"),
});

/** Raw article text, internal only — never served. Kept so the taxonomy can be re-run over the archive. */
export const newsRaw = pgTable("news_raw", {
  id: text("id").primaryKey(),
  publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  symbols: jsonb("symbols").$type<string[]>().notNull(),
  url: text("url"),
});

export const newsEvents = pgTable("news_events", {
  id: text("id").primaryKey(),
  newsId: text("news_id").notNull(),
  publishedAt: timestamp("published_at", { mode: "string", withTimezone: true }).notNull(),
  sgxEntity: text("sgx_entity").notNull(),
  sectorSlug: text("sector_slug").notNull(),
  eventType: text("event_type").notNull(),
  direction: integer("direction").notNull(),
  materiality: doublePrecision("materiality").notNull(),
});

export const ownershipTx = pgTable("ownership_tx", {
  id: text("id").primaryKey(),
  date: timestamp("date", { mode: "string", withTimezone: true }).notNull(),
  symbol: text("symbol").notNull(),
  sectorSlug: text("sector_slug"),
  holderName: text("holder_name").notNull(),
  holderType: text("holder_type"),
  txType: text("tx_type").notNull(),
  value: doublePrecision("value"),
  pctChange: doublePrecision("pct_change"),
  tags: jsonb("tags").$type<string[]>().notNull(),
});

export const betaEstimates = pgTable(
  "beta_estimates",
  {
    sectorSlug: text("sector_slug").notNull(),
    asOf: date("as_of", { mode: "string" }).notNull(),
    /** Full SensitivityResult (both directions, stability, controls) for that week. */
    result: jsonb("result").notNull(),
    beta: doublePrecision("beta"),
    pValue: doublePrecision("p_value"),
    pAdjusted: doublePrecision("p_adjusted"),
    stability: doublePrecision("stability"),
    r2: doublePrecision("r2"),
  },
  (t) => [primaryKey({ columns: [t.sectorSlug, t.asOf] })],
);

export const dailySnapshot = pgTable("daily_snapshot", {
  date: date("date", { mode: "string" }).primaryKey(),
  payload: jsonb("payload").notNull(),
});

/** One row per pipeline run — what the admin page reads to see whether users got today's data. */
export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  job: text("job").notNull(),
  trigger: text("trigger").notNull(),
  startedAt: timestamp("started_at", { mode: "string", withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { mode: "string", withTimezone: true }),
  status: text("status").notNull(),
  upstreamCalls: integer("upstream_calls").notNull().default(0),
  message: text("message"),
});
