/** Shared setup for every job: curated config, the store, and date helpers. */
import { loadEntityAliases, loadEventTaxonomy, loadExposureGraph } from "../data/load";
import { getStore } from "../db/store";
import { isoDate } from "../ingest/client";

/** Keep ~3 years plus the regression window in reach of every job. */
export const HISTORY_DAYS = 3 * 365 + 60;

/** Largest emiten per sector that make up the sector return proxy. */
export const TOP_N = Number(process.env.DIVERGENCE_TOP_N ?? 5);

export async function context() {
  return {
    store: await getStore(),
    graph: loadExposureGraph(),
    aliases: loadEntityAliases(),
    taxonomy: loadEventTaxonomy(),
  };
}

export type Ctx = Awaited<ReturnType<typeof context>>;

/** Today in WIB (UTC+7) — the date the snapshot is filed under. */
export const todayWib = () => isoDate(new Date(Date.now() + 7 * 3_600_000));

export const daysAgo = (date: string, days: number) => isoDate(new Date(Date.parse(date) - days * 86_400_000));
export const nextDay = (date: string) => daysAgo(date, -1);

export const log = (job: string, msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${job}: ${msg}`);
