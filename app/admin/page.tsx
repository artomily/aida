import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { context, daysAgo, todayWib } from "../../jobs/context";
import { healthReport } from "../../jobs/health";
import { txScore, isFinancing } from "../../scoring/flow";
import { aliasMatcher, compileTaxonomy } from "../../scoring/trigger";
import { Glass, Hero, SectionHead } from "../components/ui";
import { Pill } from "../components/score";
import { requireAdmin } from "../lib/admin";
import { ago, bare, dateLabel, dec, eventLabel } from "../lib/format";
import { logout } from "./actions";
import JobPanel from "./JobPanel";

export const metadata: Metadata = { title: "Admin — Divergence", robots: { index: false } };

/** Server actions on this page (backfill slices, pipeline) run up to five minutes. */
export const maxDuration = 300;

const TONE = { ok: "ok", warn: "warn", fail: "bad", error: "bad", partial: "warn", running: "info" } as const;

export default async function Admin() {
  await connection();
  await requireAdmin();
  const ctx = await context();
  const report = await healthReport(ctx);
  const today = todayWib();

  // Raw inputs are shown here only — the public pages and API carry derived values.
  const [news, filings] = await Promise.all([ctx.store.getNews(daysAgo(today, 3)), ctx.store.getOwnership(daysAgo(today, 30))]);
  const classify = compileTaxonomy(ctx.taxonomy);
  const mentions = aliasMatcher(ctx.aliases);
  const fails = report.checks.filter((c) => c.status === "fail").length;
  const warns = report.checks.filter((c) => c.status === "warn").length;

  return (
    <>
      <div className="ds-plate" aria-hidden="true" />
      <div className="ds-shell">
        <header className="dv-adminbar">
          <Link href="/" className="ds-link">
            ← Lihat seperti user
          </Link>
          <span>
            Admin · {ctx.store.kind === "postgres" ? "Neon Postgres" : "JSON lokal"}
          </span>
          <form action={logout}>
            <button type="submit" className="dv-linkbtn">
              Keluar
            </button>
          </form>
        </header>

        <main>
          <Hero
            eyebrow={`Admin · ${dateLabel(today)}`}
            title={fails ? <>{fails} masalah perlu dicek</> : warns ? <>Data jalan, {warns} catatan</> : <>Data user siap</>}
            tag={
              report.snapshot
                ? `User sedang melihat snapshot ${report.snapshot.date} (${report.snapshot.mode}), dibuat ${ago(report.snapshot.generatedAt)}. Pipeline otomatis jalan tiap hari bursa pukul 05:00–05:59 WIB, sebelum IDX buka.`
                : "Belum ada snapshot yang bisa dilihat user. Mulai dengan Rencana backfill, lalu Jalankan backfill."
            }
          />

          <Glass delay={0} style={{ marginBottom: 20 }}>
            <SectionHead title="Pemeriksaan data" note="Semua dibaca dari database — tidak memanggil sectors.app." />
            <ul className="dv-checks">
              {report.checks.map((c) => (
                <li key={c.label}>
                  <Pill tone={TONE[c.status]}>{c.status === "ok" ? "OK" : c.status === "warn" ? "Cek" : "Gagal"}</Pill>
                  <b>{c.label}</b>
                  <span>{c.detail}</span>
                </li>
              ))}
            </ul>
          </Glass>

          <Glass delay={0} style={{ marginBottom: 20 }}>
            <SectionHead
              title="Jalankan job"
              note="Semua tercatat di riwayat run beserta jumlah panggilan upstream. Backfill dan pipeline berhenti sendiri sebelum batas 5 menit dan bisa dilanjutkan."
            />
            <JobPanel />
          </Glass>

          <Glass delay={0} style={{ marginBottom: 20 }}>
            <SectionHead title="Riwayat run" note="30 run terakhir, dari cron, admin, dan CLI." />
            {report.runs.length ? (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Mulai (WIB)</th>
                      <th style={{ textAlign: "left" }}>Job</th>
                      <th style={{ textAlign: "left" }}>Oleh</th>
                      <th style={{ textAlign: "left" }}>Status</th>
                      <th style={{ textAlign: "right" }}>Durasi</th>
                      <th style={{ textAlign: "right" }}>Panggilan</th>
                      <th style={{ textAlign: "left" }}>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.runs.map((r) => (
                      <tr key={r.id}>
                        <td className="tnum">
                          {new Date(r.startedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td>{r.job}</td>
                        <td style={{ color: "var(--muted)" }}>{r.trigger}</td>
                        <td>
                          <Pill tone={TONE[r.status]}>{r.status}</Pill>
                        </td>
                        <td className="tnum" style={{ textAlign: "right" }}>
                          {r.finishedAt ? `${Math.round((Date.parse(r.finishedAt) - Date.parse(r.startedAt)) / 1000)} dtk` : "—"}
                        </td>
                        <td className="tnum" style={{ textAlign: "right" }}>
                          {r.upstreamCalls}
                        </td>
                        <td className="dv-wrap">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ds-note">Belum ada run.</p>
            )}
          </Glass>

          <div className="ds-grid ds-split" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            <Glass delay={0}>
              <SectionHead
                title="Berita SGX 3 hari · klasifikasi"
                note="Teks mentah hanya tampil di sini. Pastikan event dan entitas yang terdeteksi masuk akal sebelum user melihat skornya."
              />
              {news.length ? (
                <ul className="dv-inspect">
                  {news
                    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))
                    .slice(0, 40)
                    .map((n) => {
                      const events = classify(n);
                      const who = [...new Set([...n.symbols, ...mentions(`${n.title}\n${n.body}`)])];
                      return (
                        <li key={n.id}>
                          <span className="dv-dim">
                            {ago(n.publishedAt)} · {who.map(bare).join(", ") || "tanpa entitas"}
                          </span>
                          {n.url ? (
                            <a href={n.url} target="_blank" rel="noopener noreferrer">
                              {n.title}
                            </a>
                          ) : (
                            <span>{n.title}</span>
                          )}
                          <span>
                            {events.length ? (
                              events.map((e) => (
                                <Pill key={e.type} tone={e.direction < 0 ? "bad" : e.direction > 0 ? "ok" : "plain"}>
                                  {eventLabel(e.type)} · {e.where === "headline" ? "judul" : "isi"}
                                </Pill>
                              ))
                            ) : (
                              <span className="dv-dim">tidak ada event</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="ds-note">Belum ada berita tersimpan dalam 3 hari.</p>
              )}
            </Glass>

            <Glass delay={0}>
              <SectionHead title="Filing kepemilikan 30 hari" note="Masukan komponen Flow. Placement dan repo diberi bobot kecil." />
              {filings.length ? (
                <div className="ds-table-wrap">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Tanggal</th>
                        <th style={{ textAlign: "left" }}>Emiten</th>
                        <th style={{ textAlign: "left" }}>Pemegang</th>
                        <th style={{ textAlign: "left" }}>Jenis</th>
                        <th style={{ textAlign: "right" }}>Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filings
                        .toSorted((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 40)
                        .map((f) => (
                          <tr key={f.id}>
                            <td className="tnum">{f.date.slice(0, 10)}</td>
                            <td>
                              {bare(f.symbol)}
                              <div className="dv-dim">{f.sector ?? "tanpa sektor"}</div>
                            </td>
                            <td className="dv-wrap">
                              {f.holderName}
                              <div className="dv-dim">{f.holderType ?? "—"}</div>
                            </td>
                            <td>
                              {f.txType}
                              {isFinancing(f) && <div className="dv-dim">pendanaan</div>}
                            </td>
                            <td className="tnum" style={{ textAlign: "right" }}>
                              {dec(txScore(f, today), 1)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="ds-note">Belum ada filing tersimpan.</p>
              )}
            </Glass>
          </div>

          <Glass delay={0}>
            <SectionHead
              title="Cakupan harga per simbol"
              note="Simbol yang dipakai skor: entitas SGX terkait, STI, dan emiten terbesar tiap sektor IDX. Baris bertanda tertinggal belum mencapai sesi terakhir."
            />
            {report.coverage.length ? (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Simbol</th>
                      <th style={{ textAlign: "left" }}>Bursa</th>
                      <th style={{ textAlign: "left" }}>Pertama</th>
                      <th style={{ textAlign: "left" }}>Terakhir</th>
                      <th style={{ textAlign: "right" }}>Hari</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.coverage.map((c) => (
                      <tr key={c.symbol}>
                        <td>{c.symbol}</td>
                        <td style={{ color: "var(--muted)" }}>{c.market}</td>
                        <td className="tnum">{c.first}</td>
                        <td className="tnum">
                          {c.last} {c.stale && <Pill tone="warn">tertinggal</Pill>}
                        </td>
                        <td className="tnum" style={{ textAlign: "right" }}>
                          {c.rows}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ds-note">Belum ada harga tersimpan.</p>
            )}
          </Glass>
        </main>
      </div>
    </>
  );
}
