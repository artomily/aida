/**
 * The only door to sectors.app. Nothing outside `ingest/` may call upstream — that is what
 * makes "one morning fetch, every read from our own database" enforceable.
 *
 * Layers, outermost first:
 *   1. in-process memo with single-flight — concurrent identical calls share one request
 *   2. disk cache (`.cache/sectors/`) — raw responses survive restarts, so debugging and
 *      re-running a backfill never burns quota; a window that ended in the past never expires
 *   3. hourly call cap — a runaway loop costs at most SECTORS_MAX_CALLS_PER_HOUR credits;
 *      plus a per-run allowance from the daily budget in `job_runs` (jobs/guard.ts), which
 *      holds on serverless where this process's counters start from zero every invocation
 *   4. pacing + retry — at most one request in flight, exponential backoff on 429 / 5xx
 *
 * Base URL is overridable (SECTORS_API_BASE) so `scripts/sectors-mock.mjs` can stand in.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = () => process.env.SECTORS_API_BASE ?? "https://api.sectors.app/v2";
const KEY = () => process.env.SECTORS_API_KEY ?? "";

export const hasKey = () => Boolean(KEY());
export const isMock = () => /127\.0\.0\.1|localhost/.test(BASE());

/** Shortest cache window for anything that can change: prices are end-of-day, news hourly at most. */
export const HOURLY = 3600;
export const DAY = 86400;
/** For responses that cannot change (a closed historical window). */
export const FOREVER = Number.POSITIVE_INFINITY;

export class UpstreamError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* ── budget ── */

const g = globalThis as typeof globalThis & {
  __ingest?: {
    calls: number[];
    total: number;
    memo: Map<string, Promise<unknown>>;
    queue: Promise<unknown>;
    /** Calls left today for the current run; null = no daily limit set. */
    allowance: number | null;
  };
};
const state = (g.__ingest ??= { calls: [] as number[], total: 0, memo: new Map(), queue: Promise.resolve(), allowance: null });

/** Cap the calls the current run may make (what is left of today's budget); null lifts it. */
export function setAllowance(n: number | null) {
  state.allowance = n;
}

const maxPerHour = () => Number(process.env.SECTORS_MAX_CALLS_PER_HOUR ?? 400);

function spend(label: string) {
  const cutoff = Date.now() - 3_600_000;
  while (state.calls.length && state.calls[0] < cutoff) state.calls.shift();
  if (state.calls.length >= maxPerHour())
    throw new UpstreamError(429, `budget: ${maxPerHour()} sectors.app calls/hour reached, skipped ${label}`);
  if (state.allowance !== null) {
    if (state.allowance <= 0) throw new UpstreamError(429, `budget: batas harian SECTORS_MAX_CALLS_PER_DAY habis, ${label} dilewati`);
    state.allowance--;
  }
  state.calls.push(Date.now());
  state.total++;
}

/** Upstream calls made by this process: last rolling hour and since start. */
export const usage = () => ({
  lastHour: state.calls.filter((t) => t >= Date.now() - 3_600_000).length,
  total: state.total,
  maxPerHour: maxPerHour(),
});

/* ── disk cache ── */

const diskEnabled = () => process.env.SECTORS_DISK_CACHE !== "0" && !process.env.VERCEL;
const cacheDir = () => path.join(process.cwd(), ".cache", isMock() ? "sectors-mock" : "sectors");

function readDisk<T>(key: string, ttl: number): T | undefined {
  if (!diskEnabled()) return undefined;
  try {
    const hit = JSON.parse(readFileSync(path.join(cacheDir(), key + ".json"), "utf8")) as { at: number; body: T };
    return Date.now() - hit.at < ttl * 1000 ? hit.body : undefined;
  } catch {
    return undefined;
  }
}

function writeDisk(key: string, url: string, body: unknown) {
  if (!diskEnabled()) return;
  mkdirSync(cacheDir(), { recursive: true });
  writeFileSync(path.join(cacheDir(), key + ".json"), JSON.stringify({ at: Date.now(), url, body }));
}

/* ── request ── */

/*
 * sectors.app rate-limits per minute (undocumented; a 2026-10-07 backfill hit 429 after ~37
 * calls at 120 ms pacing). Default to ~40 calls/minute; override with SECTORS_PACE_MS.
 */
const paceMs = () => Number(process.env.SECTORS_PACE_MS ?? 1500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: URL, label: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    spend(label);
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: KEY() }, cache: "no-store" });
    } catch (e) {
      // Dropped connection / DNS blip: no response, so retry like a 5xx.
      if (attempt >= 3) throw e;
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res.json();
    const body = await res.text().catch(() => "");
    const limited = res.status === 429;
    const retryable = limited || res.status >= 500;
    if (!retryable || attempt >= (limited ? 5 : 3)) throw new UpstreamError(res.status, `sectors.app ${res.status} ${label}: ${body.slice(0, 200)}`);
    // A rate-limit window is a minute: back off 15 s, 30 s, 60 s… rather than hammering it.
    await sleep(Number(res.headers.get("retry-after")) * 1000 || (limited ? 15_000 : 1000) * 2 ** attempt);
  }
}

export type Params = Record<string, string | number | undefined>;

/** GET `path` with `params`, cached for `ttl` seconds (memory + disk). */
export function get<T>(apiPath: string, params: Params, ttl: number): Promise<T> {
  if (!KEY()) return Promise.reject(new UpstreamError(401, "SECTORS_API_KEY is not set"));
  const url = new URL(BASE() + apiPath);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const key = createHash("sha1").update(url.toString()).digest("hex");

  const inflight = state.memo.get(key);
  if (inflight) return inflight as Promise<T>;

  const disk = readDisk<T>(key, ttl);
  if (disk !== undefined) return Promise.resolve(disk);

  // Serialise upstream requests: one in flight, paced, so a backfill never bursts.
  const run = state.queue.then(async () => {
    const body = await fetchWithRetry(url, apiPath);
    writeDisk(key, url.toString(), body);
    await sleep(paceMs());
    return body as T;
  });
  state.queue = run.catch(() => undefined);
  const p = run.finally(() => state.memo.delete(key));
  state.memo.set(key, p);
  return p;
}

type Page<T> = { results?: T[]; pagination?: { has_next?: boolean; next_offset?: number | null } };

/** Follow `next_offset` until the feed ends or `maxPages` is reached. */
export async function allPages<T>(apiPath: string, params: Params, limit: number, ttl: number, maxPages: number): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (let i = 0; i < maxPages; i++) {
    const page = await get<Page<T>>(apiPath, { ...params, limit, offset }, ttl);
    out.push(...(page.results ?? []));
    if (!page.pagination?.has_next || page.pagination.next_offset == null) break;
    offset = page.pagination.next_offset;
  }
  return out;
}

export const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && !isNaN(+v) ? +v : null;
export const str = (v: unknown) => (typeof v === "string" && v ? v : null);
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
