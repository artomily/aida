/**
 * What the admin checks before trusting what users see: is today's snapshot there, is it live
 * data, are prices current and deep enough, did the last runs succeed, are the curated links
 * resolving. Read-only — never calls upstream.
 */
import type { JobRun, PriceCoverage } from "../db/store";
import { hasKey, isMock } from "../ingest/client";
import { sgxSymbols } from "../scoring/series";
import { DEFAULT_SENSITIVITY } from "../scoring/sensitivity";
import type { Snapshot } from "../scoring/types";
import { type Ctx, daysAgo, todayWib } from "./context";
import { idxMembers } from "./daily";

export type Check = { label: string; status: "ok" | "warn" | "fail"; detail: string };

/** The latest weekday strictly before `date` — the session a pre-open snapshot should include. */
export function previousSession(date: string) {
  let d = daysAgo(date, 1);
  while ([0, 6].includes(new Date(d + "T00:00:00Z").getUTCDay())) d = daysAgo(d, 1);
  return d;
}

const hourWib = () => (new Date().getUTCHours() + 7) % 24;

export async function healthReport(ctx: Ctx) {
  const today = todayWib();
  const [snapshot, runs, coverage, companies, betas, news, filingsLast] = await Promise.all([
    ctx.store.getSnapshot(),
    ctx.store.listJobRuns(30),
    ctx.store.priceCoverage(),
    ctx.store.getCompanies(),
    ctx.store.getLatestBetas(),
    ctx.store.getNews(daysAgo(today, 3)),
    ctx.store.lastOwnershipDate(),
  ]);

  const checks: Check[] = [];
  const add = (label: string, status: Check["status"], detail: string) => checks.push({ label, status, detail });

  add(
    "Database",
    ctx.store.kind === "postgres" ? "ok" : process.env.VERCEL ? "fail" : "warn",
    ctx.store.kind === "postgres" ? "Postgres (Neon) — data dibagikan ke semua user." : "File JSON lokal (.data/) — belum Neon; hanya untuk pengembangan.",
  );
  add("Kunci sectors.app", hasKey() ? "ok" : "fail", hasKey() ? (isMock() ? "Terhubung ke server mock lokal." : "SECTORS_API_KEY terpasang.") : "SECTORS_API_KEY belum diisi.");
  add("Cron", process.env.CRON_SECRET ? "ok" : "warn", process.env.CRON_SECRET ? "CRON_SECRET terpasang; pipeline jalan otomatis 05:00–05:59 WIB hari bursa." : "CRON_SECRET kosong — cron Vercel akan ditolak.");

  // What users see right now.
  if (!snapshot) add("Snapshot untuk user", "fail", "Belum ada snapshot — user melihat halaman kosong. Jalankan backfill.");
  else if (snapshot.mode === "mock") add("Snapshot untuk user", "fail", `Snapshot ${snapshot.date} berisi data mock — jangan disebar ke user.`);
  else if (snapshot.date === today) add("Snapshot untuk user", "ok", `Snapshot hari ini (${snapshot.date}) sudah tersedia.`);
  else if (hourWib() < 6) add("Snapshot untuk user", "warn", `Masih ${snapshot.date}; run pagi belum waktunya (sebelum 06:00 WIB).`);
  else add("Snapshot untuk user", "fail", `User masih melihat snapshot ${snapshot.date}; run hari ini belum berhasil.`);

  const lastPipeline = runs.find((r) => r.job === "pipeline");
  if (!lastPipeline) add("Run pipeline terakhir", "warn", "Belum pernah jalan.");
  else
    add(
      "Run pipeline terakhir",
      lastPipeline.status === "ok" ? "ok" : lastPipeline.status === "running" ? "warn" : "fail",
      `${lastPipeline.status} · ${lastPipeline.startedAt.slice(0, 16).replace("T", " ")} UTC · ${lastPipeline.message ?? ""}`,
    );

  // Prices: every symbol the score depends on, current to the previous session and deep enough.
  const needed = [...sgxSymbols(ctx.graph), ...idxMembers(companies)];
  const byMarket = new Map(coverage.map((c) => [c.symbol, c]));
  const expected = previousSession(today);
  const missing = needed.filter((s) => !byMarket.has(s));
  // Three days of slack covers exchange holidays that the weekday calendar doesn't know about.
  const stale = needed.filter((s) => byMarket.has(s) && byMarket.get(s)!.last < daysAgo(expected, 3));
  const shallow = needed.filter((s) => byMarket.has(s) && byMarket.get(s)!.rows < DEFAULT_SENSITIVITY.window + 20);
  add(
    "Kelengkapan harga",
    missing.length ? "fail" : stale.length ? "warn" : "ok",
    missing.length
      ? `${missing.length}/${needed.length} simbol belum punya harga: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`
      : stale.length
        ? `${stale.length} simbol tertinggal dari sesi ${expected}: ${stale.slice(0, 8).join(", ")}`
        : `${needed.length} simbol lengkap sampai sesi ${expected}.`,
  );
  const idxKnown = companies.some((c) => c.market === "IDX");
  add(
    "Kedalaman riwayat",
    shallow.length || missing.length || !idxKnown ? "warn" : "ok",
    !idxKnown
      ? "Universe IDX belum diambil, jadi emiten penyusun sektor belum diketahui. Backfill mengambilnya lebih dulu."
      : shallow.length || missing.length
        ? `${shallow.length + missing.length} simbol di bawah ${DEFAULT_SENSITIVITY.window + 20} hari — uji sensitivitas belum bisa dipercaya. Jalankan backfill.`
        : "Semua simbol cukup untuk jendela regresi.",
  );

  add(
    "Estimasi beta",
    !betas ? "fail" : betas.asOf < daysAgo(today, 8) ? "warn" : "ok",
    betas ? `Terakhir ${betas.asOf}.` : "Belum ada — dibuat oleh backfill atau job mingguan.",
  );
  add("Berita SGX", news.length ? "ok" : "warn", `${news.length} artikel entitas terkait dalam 3 hari.`);
  add(
    "Filing kepemilikan IDX",
    filingsLast && filingsLast.slice(0, 10) >= daysAgo(today, 7) ? "ok" : "warn",
    filingsLast ? `Terbaru ${filingsLast.slice(0, 10)}.` : "Belum ada.",
  );

  const caps = new Map(companies.map((c) => [c.symbol, c.marketCap]));
  const unresolved = [...new Set(ctx.graph.relationships.map((r) => r.idxSymbol ?? r.sgxEntity))].filter((s) => !caps.get(s));
  const unverified = ctx.graph.relationships.filter((r) => !r.verified).length;
  add(
    "Graf eksposur",
    unresolved.length ? "warn" : unverified ? "warn" : "ok",
    [
      unresolved.length ? `${unresolved.length} ticker tanpa market cap (tidak dihitung): ${unresolved.join(", ")}` : "",
      unverified ? `${unverified}/${ctx.graph.relationships.length} hubungan belum diverifikasi.` : "",
    ]
      .filter(Boolean)
      .join(" ") || "Semua hubungan terverifikasi dan ter-resolve.",
  );

  return { today, snapshot, runs, checks, coverage: coverageRows(coverage, needed, expected) };
}

export type CoverageRow = PriceCoverage & { stale: boolean };

function coverageRows(coverage: PriceCoverage[], needed: string[], expected: string): CoverageRow[] {
  const set = new Set(needed);
  return coverage
    .filter((c) => set.has(c.symbol))
    .map((c) => ({ ...c, stale: c.last < daysAgo(expected, 3) }))
    .sort((a, b) => a.market.localeCompare(b.market) || a.symbol.localeCompare(b.symbol));
}

export type HealthReport = Awaited<ReturnType<typeof healthReport>>;
export type { JobRun, Snapshot };
