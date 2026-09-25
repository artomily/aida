/**
 * Exercise the Postgres store end to end without a server: apply `db/migrations` to an
 * in-memory PGlite database, then round-trip every Store method.
 *
 *   npx tsx scripts/db-check.ts
 */
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { pgStore } from "../db/pg-store";
import * as schema from "../db/schema";
import { loadExposureGraph } from "../data/load";
import type { SensitivityResult, Snapshot } from "../scoring/types";

async function main() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "db/migrations" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = pgStore(db as any);

  await store.putCompanies([
    { symbol: "ASII.JK", name: "Astra", market: "IDX", sector: "industrials", marketCap: 2e14 },
    { symbol: "C07.SI", name: "JC&C", market: "SGX", sector: "industrials", marketCap: 1.1e10 },
  ]);
  await store.putCompanies([{ symbol: "ASII.JK", name: "Astra International", market: "IDX", sector: "industrials", marketCap: 2.1e14 }]);
  const companies = await store.getCompanies();
  assert.equal(companies.length, 2);
  assert.equal(companies.find((c) => c.symbol === "ASII.JK")!.marketCap, 2.1e14);

  await store.putRelationships(loadExposureGraph());
  await store.putRelationships(loadExposureGraph());

  await store.putPrices([
    { date: "2026-09-23", symbol: "ASII.JK", market: "IDX", close: 5000 },
    { date: "2026-09-24", symbol: "ASII.JK", market: "IDX", close: 5100 },
    { date: "2026-09-24", symbol: "C07.SI", market: "SGX", close: 28.5 },
  ]);
  await store.putPrices([{ date: "2026-09-24", symbol: "ASII.JK", market: "IDX", close: 5125 }]);
  assert.equal((await store.getPrices("2026-09-24")).length, 2);
  assert.equal((await store.getPrices("2026-09-24")).find((p) => p.symbol === "ASII.JK")!.close, 5125);
  assert.equal((await store.lastPriceDates()).get("ASII.JK"), "2026-09-24");

  await store.putSectorIndex([{ date: "2026-09-24", sector: "industrials", market: "IDX", return: 0.02 }]);

  await store.putControls([
    { date: "2026-09-24", series: "usdidr", value: 16300 },
    { date: "2026-09-24", series: "hsi", value: 26000 },
  ]);
  await store.putControls([{ date: "2026-09-24", series: "usdidr", value: 16310 }]);
  const controls = await store.getControls("2026-09-01");
  assert.deepEqual(controls.map((c) => `${c.series}=${c.value}`).sort(), ["hsi=26000", "usdidr=16310"]);

  await store.putNews([{ id: "n1", publishedAt: "2026-09-24T01:00:00Z", title: "t", body: "b", symbols: ["C07.SI"], url: null }]);
  await store.putNews([{ id: "n1", publishedAt: "2026-09-24T01:00:00Z", title: "t", body: "b", symbols: ["C07.SI"], url: null }]);
  const news = await store.getNews("2026-09-20");
  assert.equal(news.length, 1);
  assert.deepEqual(news[0].symbols, ["C07.SI"]);
  await store.putNewsEvents([
    { id: "n1|profit_warning|industrials", newsId: "n1", publishedAt: "2026-09-24T01:00:00Z", sgxEntity: "C07.SI", sector: "industrials", eventType: "profit_warning", direction: -1, materiality: 1 },
  ]);

  await store.putOwnership([
    { id: "f1", date: "2026-09-22T00:00:00Z", symbol: "ASII.JK", sector: "industrials", holderName: "JC&C", holderType: "corporate-investor", txType: "buy", value: 1e9, pctChange: 0.5, tags: [] },
  ]);
  assert.equal((await store.getOwnership("2026-09-01")).length, 1);
  assert.ok((await store.lastOwnershipDate())?.startsWith("2026-09-22"));

  const r = { beta: 0.3, pValue: 0.01, pAdjusted: 0.04, stability: 0.9, r2: 0.05, n: 500 } as SensitivityResult;
  await store.putBetas("2026-09-20", new Map([["industrials", r]]));
  await store.putBetas("2026-09-27", new Map([["industrials", { ...r, beta: 0.31 }]]));
  const betas = await store.getLatestBetas();
  assert.equal(betas?.asOf, "2026-09-27");
  assert.equal(betas?.results.get("industrials")?.beta, 0.31);

  const snap = { date: "2026-09-25", mode: "mock", sectors: [], notes: [] } as unknown as Snapshot;
  await store.putSnapshot({ ...snap, date: "2026-09-24" });
  await store.putSnapshot(snap);
  await store.putSnapshot({ ...snap, notes: ["rewritten"] });
  assert.equal((await store.getSnapshot())?.date, "2026-09-25");
  assert.deepEqual((await store.getSnapshot())?.notes, ["rewritten"]);
  assert.equal((await store.getSnapshot("2026-09-24"))?.date, "2026-09-24");

  await store.putJobRun({ id: "r1", job: "pipeline", trigger: "cron", startedAt: "2026-09-25T22:00:00Z", finishedAt: null, status: "running", upstreamCalls: 0, message: null });
  await store.putJobRun({ id: "r1", job: "pipeline", trigger: "cron", startedAt: "2026-09-25T22:00:00Z", finishedAt: "2026-09-25T22:01:00Z", status: "ok", upstreamCalls: 42, message: "done" });
  const runs = await store.listJobRuns(5);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, "ok");
  assert.equal(runs[0].upstreamCalls, 42);

  const cov = await store.priceCoverage();
  assert.deepEqual(cov.find((c) => c.symbol === "ASII.JK"), { symbol: "ASII.JK", market: "IDX", first: "2026-09-23", last: "2026-09-24", rows: 2 });

  console.log("pg-store: migrations applied, all Store methods round-trip on PGlite");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
