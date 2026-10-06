/**
 * Local stand-in for Postgres: one JSON file per table under AIDA_DATA_DIR (default
 * `.data/`). Writes go to a temp file and are renamed into place, so the dev server never
 * reads a half-written table while a job runs.
 */
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SectorSlug } from "../scoring/sectors";
import type { ControlRow, NewsItem, OwnershipTx, PriceRow, SensitivityResult, Snapshot } from "../scoring/types";
import type { JobRun, PriceCoverage, Store } from "./store";

export function fileStore(dir = process.env.AIDA_DATA_DIR ?? path.join(process.cwd(), ".data")): Store {
  const file = (name: string) => path.join(dir, name + ".json");

  function read<T>(name: string, fallback: T): T {
    try {
      return JSON.parse(readFileSync(file(name), "utf8")) as T;
    } catch {
      return fallback;
    }
  }
  function write(name: string, value: unknown) {
    mkdirSync(path.dirname(file(name)), { recursive: true });
    const tmp = `${file(name)}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(value));
    renameSync(tmp, file(name));
  }
  /** Merge rows into a table by key; later rows win. */
  function upsert<T>(name: string, rows: T[], key: (r: T) => string) {
    if (!rows.length) return;
    const table = new Map(read<T[]>(name, []).map((r) => [key(r), r]));
    for (const r of rows) table.set(key(r), r);
    write(name, [...table.values()]);
  }

  return {
    kind: "file",
    async putCompanies(rows) {
      upsert("companies", rows, (r) => r.symbol);
    },
    async getCompanies() {
      return read("companies", []);
    },
    async putRelationships(graph) {
      write("relationships", graph.relationships);
    },
    async putPrices(rows) {
      upsert("prices_daily", rows, (r) => `${r.date}|${r.symbol}`);
    },
    async getPrices(from) {
      return read<PriceRow[]>("prices_daily", []).filter((r) => r.date >= from);
    },
    async lastPriceDates() {
      const out = new Map<string, string>();
      for (const r of read<PriceRow[]>("prices_daily", [])) if ((out.get(r.symbol) ?? "") < r.date) out.set(r.symbol, r.date);
      return out;
    },
    async priceCoverage() {
      const out = new Map<string, PriceCoverage>();
      for (const r of read<PriceRow[]>("prices_daily", [])) {
        const c = out.get(r.symbol) ?? { symbol: r.symbol, market: r.market, first: r.date, last: r.date, rows: 0 };
        if (r.date < c.first) c.first = r.date;
        if (r.date > c.last) c.last = r.date;
        c.rows++;
        out.set(r.symbol, c);
      }
      return [...out.values()];
    },
    async putSectorIndex(rows) {
      upsert("sector_index", rows, (r) => `${r.date}|${r.sector}|${r.market}`);
    },
    async putControls(rows) {
      upsert("controls_daily", rows, (r) => `${r.date}|${r.series}`);
    },
    async getControls(from) {
      return read<ControlRow[]>("controls_daily", []).filter((r) => r.date >= from);
    },
    async putNews(items) {
      upsert("news_raw", items, (r) => r.id);
    },
    async getNews(since) {
      return read<NewsItem[]>("news_raw", []).filter((r) => r.publishedAt >= since);
    },
    async putNewsEvents(rows) {
      upsert("news_events", rows, (r) => r.id);
    },
    async putOwnership(rows) {
      upsert("ownership_tx", rows, (r) => r.id);
    },
    async getOwnership(since) {
      return read<OwnershipTx[]>("ownership_tx", []).filter((r) => r.date >= since);
    },
    async lastOwnershipDate() {
      return read<OwnershipTx[]>("ownership_tx", []).reduce<string | null>((m, r) => (!m || r.date > m ? r.date : m), null);
    },
    async putBetas(asOf, results) {
      const all = read<Record<string, Record<string, SensitivityResult>>>("beta_estimates", {});
      all[asOf] = Object.fromEntries(results);
      write("beta_estimates", all);
    },
    async getLatestBetas() {
      const all = read<Record<string, Record<string, SensitivityResult>>>("beta_estimates", {});
      const asOf = Object.keys(all).sort().at(-1);
      return asOf ? { asOf, results: new Map(Object.entries(all[asOf]) as [SectorSlug, SensitivityResult][]) } : null;
    },
    async putSnapshot(snapshot) {
      write(`snapshots/${snapshot.date}`, snapshot);
    },
    async putJobRun(run) {
      upsert("job_runs", [run], (r) => r.id);
    },
    async listJobRuns(limit) {
      return read<JobRun[]>("job_runs", [])
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, limit);
    },
    async getSnapshot(date) {
      if (date) return read<Snapshot | null>(`snapshots/${date}`, null);
      let dates: string[] = [];
      try {
        dates = readdirSync(path.join(dir, "snapshots")).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
      } catch {
        return null;
      }
      const latest = dates.sort().at(-1);
      return latest ? read<Snapshot | null>(`snapshots/${latest.slice(0, 10)}`, null) : null;
    },
  };
}
