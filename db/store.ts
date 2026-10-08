/**
 * Storage boundary. Postgres (Neon) when DATABASE_URL is set; otherwise JSON files under
 * `.data/` so the pipeline runs locally before a database exists. Both implement the same
 * interface, and the jobs never know which one they got.
 */
import type { SectorSlug } from "../scoring/sectors";
import type {
  Company,
  ControlRow,
  ExposureGraph,
  NewsItem,
  OwnershipTx,
  PriceRow,
  SensitivityResult,
  Snapshot,
} from "../scoring/types";

export type SectorIndexRow = { date: string; sector: SectorSlug; market: "IDX" | "SGX"; return: number };
export type NewsEventRow = {
  id: string;
  newsId: string;
  publishedAt: string;
  sgxEntity: string;
  sector: SectorSlug;
  eventType: string;
  direction: number;
  materiality: number;
};

export type JobRun = {
  id: string;
  job: string;
  /** Who started it: the cron, an admin on /admin, or the CLI. */
  trigger: "cron" | "admin" | "cli";
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "partial" | "error";
  upstreamCalls: number;
  message: string | null;
};

export type User = { id: string; email: string; name: string; passwordHash: string; createdAt: string };

export type PriceCoverage = { symbol: string; market: "IDX" | "SGX"; first: string; last: string; rows: number };

export interface Store {
  readonly kind: "postgres" | "file";
  putCompanies(rows: Company[]): Promise<void>;
  getCompanies(): Promise<Company[]>;
  putRelationships(graph: ExposureGraph): Promise<void>;
  putPrices(rows: PriceRow[]): Promise<void>;
  getPrices(from: string): Promise<PriceRow[]>;
  /** Last stored close date per symbol. */
  lastPriceDates(): Promise<Map<string, string>>;
  /** First / last stored close and row count per symbol. */
  priceCoverage(): Promise<PriceCoverage[]>;
  putSectorIndex(rows: SectorIndexRow[]): Promise<void>;
  putControls(rows: ControlRow[]): Promise<void>;
  getControls(from: string): Promise<ControlRow[]>;
  putNews(items: NewsItem[]): Promise<void>;
  getNews(since: string): Promise<NewsItem[]>;
  putNewsEvents(rows: NewsEventRow[]): Promise<void>;
  putOwnership(rows: OwnershipTx[]): Promise<void>;
  getOwnership(since: string): Promise<OwnershipTx[]>;
  lastOwnershipDate(): Promise<string | null>;
  putBetas(asOf: string, results: Map<SectorSlug, SensitivityResult>): Promise<void>;
  getLatestBetas(): Promise<{ asOf: string; results: Map<SectorSlug, SensitivityResult> } | null>;
  putSnapshot(snapshot: Snapshot): Promise<void>;
  /** The given day's snapshot, or the most recent one. */
  getSnapshot(date?: string): Promise<Snapshot | null>;
  putJobRun(run: JobRun): Promise<void>;
  listJobRuns(limit: number): Promise<JobRun[]>;
  /** Insert a new account; false when the (lower-cased) email is already taken. */
  createUser(user: User): Promise<boolean>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
}

/*
 * Cached per module instance, not on globalThis: a hot reload (new store method, DATABASE_URL
 * added to .env) must get a fresh store, and the Neon HTTP client is cheap to recreate.
 */
let cached: Promise<Store> | undefined;

export function getStore(): Promise<Store> {
  // Serverless filesystems are read-only and per-instance: without Postgres nothing would persist.
  if (process.env.VERCEL && !process.env.DATABASE_URL)
    return Promise.reject(new Error("DATABASE_URL is required on Vercel — connect the Neon database first"));
  return (cached ??= process.env.DATABASE_URL
    ? import("./pg-store").then((m) => m.neonStore(process.env.DATABASE_URL!))
    : import("./file-store").then((m) => m.fileStore()));
}
