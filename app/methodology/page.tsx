import type { Metadata } from "next";
import Link from "next/link";
import { loadEventTaxonomy, loadExposureGraph } from "../../data/load";
import { DEFAULT_FLOW } from "../../scoring/flow";
import { DEFAULT_TRIGGER } from "../../scoring/trigger";
import type { RelationType } from "../../scoring/types";
import { Footer, Notices, Pill } from "../components/score";
import SiteHeader from "../components/SiteHeader";
import { Glass, Hero, MeterPanel, SectionHead, ShieldIcon } from "../components/ui";
import { loadSnapshot } from "../lib/data";
import { RELATION_LABEL, bare, dec, eventLabel, pct, pval } from "../lib/format";

export const metadata: Metadata = {
  title: "Metodologi — Aida",
  description: "Cara skor perhatian dihitung, hasil uji lead-lag SGX → IDX per sektor, dan keterbatasannya.",
};

const LIMITS = [
  {
    title: "Jendela prediktif sempit",
    body: "SGX buka satu jam sebelum IDX dalam WIB, tapi keunggulan itu hanya ada antara pembukaan SGX dan IDX. Setelah 09:00 WIB kedua pasar berjalan paralel. Data sectors.app juga harga penutupan harian, jadi skor pagi memakai sesi IDX kemarin.",
  },
  {
    title: "Beta harian bisa lemah walau hubungannya nyata",
    body: "Riset lintas pasar menunjukkan Singapura memimpin pasar kawasan pada horizon lebih panjang, bukan harian. Karena itu Eksposur — bukan beta — yang menjadi dasar skor.",
  },
  {
    title: "Return sektor adalah proksi",
    body: "Indeks sektor IDX-IC tidak tersedia di sumber data, jadi return sektor dihitung dari emiten terbesar per sektor dengan bobot kapitalisasi hari ini. Ini mengandung bias survivorship dan bobot yang tidak historis.",
  },
  {
    title: "Pemetaan IDX-IC ke GICS tidak sempurna",
    body: "Infrastruktur, Transportasi & Logistik, dan Teknologi tidak punya padanan GICS yang bersih — baca hasil sektor-sektor itu dengan keyakinan lebih rendah.",
  },
  {
    title: "Graf eksposur dikurasi tangan",
    body: "Hubungan SGX ↔ IDX disusun manual dan belum lengkap. Baris bertanda “belum diverifikasi” perlu dicek ke laporan tahunan; kecocokan nama di data kepemilikan IDX ditampilkan di bawah sebagai bukti tambahan.",
  },
  {
    title: "Komoditas hanya sebagai kontrol",
    body: "Harga batu bara dan CPO dipakai sebagai variabel kontrol bila tersedia, belum sebagai komponen skor sendiri.",
  },
];

export default async function Methodology() {
  const snapshot = await loadSnapshot();
  const graph = loadExposureGraph();
  const taxonomy = loadEventTaxonomy();
  const v = snapshot?.validation;

  return (
    <>
      <div className="ds-plate" aria-hidden="true" />
      <div className="ds-shell">
        <SiteHeader current="methodology" sectorHref={snapshot ? `/sector/${snapshot.sectors[0].slug}` : undefined} />
        <main>
          <Hero
            eyebrow="Metodologi"
            title={
              <>
                Kami menguji keterkaitannya,
                <br />
                bukan mengasumsikannya
              </>
            }
            tag="Lebih dari 20 perusahaan SGX beroperasi utama di Indonesia, dan beberapa emiten besar IDX dimiliki entitas Singapura. Apakah itu menghasilkan sinyal? Kami uji per sektor, dan melaporkan di mana ia berlaku dan di mana tidak."
            aside={
              v && (
                <MeterPanel
                  title="Hasil uji saat ini"
                  icon={<ShieldIcon />}
                  big={`${v.significant} / 11`}
                  sub={
                    <>
                      sektor lolos koreksi BH
                      <br />
                      pada α = {dec(v.alpha)} · arah balik {v.reverseSignificant} / 11
                      {v.sameDaySignificant !== undefined && (
                        <>
                          <br />
                          bergerak bersama di hari yang sama (T+0) {v.sameDaySignificant} / 11
                        </>
                      )}
                    </>
                  }
                  scale={["0", "3", "6", "9", "11"]}
                  fill={v.significant / 11}
                  label={`${v.significant} dari 11 sektor signifikan`}
                />
              )
            }
          />

          {snapshot && <Notices snapshot={snapshot} />}

          <Glass delay={200} className="dv-anchor" style={{ marginBottom: 20 }}>
            <div id="rumus" />
            <SectionHead
              title="Rumus"
              note="Perkalian, bukan jumlah berbobot: sektor harus terhubung secara struktural, responsif secara historis, dan punya pemicu hari ini untuk naik ke atas. Jumlah berbobot akan membiarkan satu komponen yang ramai mengangkat sektor tanpa keterkaitan nyata."
            />
            <pre className="dv-code">{`Base        = Exposure(sector)                  # struktural, statis
Sensitivity = |β| × stabilitas                  # historis, diperbarui mingguan
Flow        = intensitas transaksi orang dalam  # harian, deterministik
Trigger     = intensitas event berita SGX       # harian, berbasis aturan

Attention   = Base × (0,5 + Sensitivity) × (1 + Flow + Trigger)
Confidence  = korelasi bergulir 60 hari         # ditampilkan terpisah, tidak dikalikan`}</pre>
            <p className="ds-note" style={{ marginTop: 12 }}>
              Flow dan Trigger masuk sebagai intensitas tanpa arah (0–1, fungsi tanh): aksi jual besar sama layak diperhatikan
              dengan aksi beli besar. Arah tetap ditampilkan di halaman sektor. LLM hanya dipakai di satu tempat — menyusun
              ringkasan pagi dari skor yang sudah jadi; ia tidak pernah mengubah angka.
            </p>
          </Glass>

          <Glass delay={240} style={{ marginBottom: 20 }}>
            <SectionHead
              title="Uji lead-lag per sektor"
              note={
                v
                  ? `T+1: r_IDX(t) = a + b₁·r_SGX(t−1) + kontrol + e — yang dipakai skor. T+0: r_SGX(t) di hari yang sama — hanya menunjukkan seberapa erat kedua pasar bergerak bersama, tidak bisa dipakai sebelum IDX buka, jadi tidak masuk skor. Jendela ${v.window} hari bursa · riwayat ${v.history.days} hari (${v.history.from ?? "—"} s/d ${v.history.to ?? "—"}) · p dikoreksi Benjamini–Hochberg di 11 sektor · stabilitas = porsi jendela bergulir dengan tanda β yang sama.`
                  : "Belum ada snapshot — jalankan backfill untuk mengisi tabel ini."
              }
            />
            {snapshot && (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Sektor</th>
                      <th style={{ textAlign: "left" }}>Seri SGX</th>
                      <th style={{ textAlign: "right" }}>n</th>
                      <th style={{ textAlign: "right" }}>
                        β T+0<small>hari yang sama</small>
                      </th>
                      <th style={{ textAlign: "right" }}>
                        p<small>terkoreksi</small>
                      </th>
                      <th style={{ textAlign: "right" }}>
                        β T+1<small>SG kemarin → ID</small>
                      </th>
                      <th style={{ textAlign: "right" }}>p</th>
                      <th style={{ textAlign: "right" }}>
                        p<small>terkoreksi</small>
                      </th>
                      <th style={{ textAlign: "right" }}>Stabilitas</th>
                      <th style={{ textAlign: "right" }}>R²</th>
                      <th style={{ textAlign: "right" }}>
                        β<small>ID → SG</small>
                      </th>
                      <th style={{ textAlign: "right" }}>
                        p<small>terkoreksi</small>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.sectors
                      .toSorted((a, b) => a.name.localeCompare(b.name))
                      .map(({ slug, name, sensitivity: r }) => (
                        <tr key={slug}>
                          <td>
                            <Link className="ds-link" href={`/sector/${slug}`}>
                              {name}
                            </Link>
                          </td>
                          <td style={{ color: "var(--muted2)" }}>{r.sgxSeries === "sti" ? "STI" : "keranjang terkait"}</td>
                          <td className="tnum" style={{ textAlign: "right" }}>{r.n}</td>
                          <td className="tnum" style={{ textAlign: "right" }}>{dec(r.sameDay?.beta ?? null, 3)}</td>
                          <td className="tnum" style={{ textAlign: "right", color: r.sameDay?.significant ? "var(--ok-ink)" : undefined }}>
                            {pval(r.sameDay?.pAdjusted ?? null)}
                          </td>
                          <td className="tnum" style={{ textAlign: "right" }}>{dec(r.beta, 3)}</td>
                          <td className="tnum" style={{ textAlign: "right" }}>{pval(r.pValue)}</td>
                          <td className="tnum" style={{ textAlign: "right", color: r.significant ? "var(--ok-ink)" : undefined, fontWeight: r.significant ? 600 : undefined }}>
                            {pval(r.pAdjusted)}
                          </td>
                          <td className="tnum" style={{ textAlign: "right" }}>{pct(r.stability)}</td>
                          <td className="tnum" style={{ textAlign: "right" }}>{dec(r.r2, 3)}</td>
                          <td className="tnum" style={{ textAlign: "right" }}>{dec(r.reverse.beta, 3)}</td>
                          <td className="tnum" style={{ textAlign: "right", color: r.reverse.significant ? "var(--ok-ink)" : undefined }}>
                            {pval(r.reverse.pAdjusted)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            {v && (
              <p className="ds-body" style={{ marginTop: 16 }}>
                {v.significant === 0 ? (
                  <>
                    <Pill tone="warn">Belum ada sektor yang lolos</Pill> Sensitivitas dilaporkan sebagai “tidak ditemukan” dan
                    tidak disetel ulang sampai muncul sesuatu. Eksposur tetap berdiri sendiri sebagai peta keterkaitan.
                  </>
                ) : (
                  <>
                    <Pill tone="ok">{v.significant} sektor lolos koreksi</Pill> Hanya sektor-sektor itu yang mendapat nilai
                    Sensitivitas di atas nol.
                  </>
                )}{" "}
                Variabel kontrol dipakai: {v.controlsUsed.length ? v.controlsUsed.join(", ") : "belum ada"}
                {v.controlsMissing.length ? ` · belum tersedia: ${v.controlsMissing.join(", ")}` : ""}.
              </p>
            )}
          </Glass>

          <div className="ds-grid ds-split" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            <Glass delay={280}>
              <SectionHead
                title="Eksposur: bobot hubungan"
                note={`${graph.relationships.length} hubungan terkurasi di data/exposure_graph.yaml, ${graph.relationships.filter((r) => r.verified).length} sudah diverifikasi.`}
              />
              {(Object.entries(graph.relationWeights) as [RelationType, number][]).map(([k, w]) => (
                <div key={k} className="ds-kv">
                  <span>{RELATION_LABEL[k]}</span>
                  <span className="tnum">{dec(w, 1)}</span>
                </div>
              ))}
              {v && v.ownershipMatches.length > 0 && (
                <>
                  <h3 className="ds-h2" style={{ fontSize: 16, margin: "18px 0 6px" }}>
                    Terlihat di data kepemilikan IDX
                  </h3>
                  {v.ownershipMatches.map((m) => (
                    <div key={`${m.sgxEntity}-${m.symbol}`} className="ds-kv">
                      <span>
                        {bare(m.sgxEntity)} di {bare(m.symbol)}
                      </span>
                      <span>{m.date}</span>
                    </div>
                  ))}
                </>
              )}
            </Glass>

            <Glass delay={320}>
              <SectionHead
                title="Pemicu dan Flow: aturan"
                note={`Taksonomi di data/event_taxonomy.yaml · negasi dicek ${taxonomy.negationWindow} token sebelumnya · judul ${taxonomy.headlineWeight}× isi · berita ${DEFAULT_TRIGGER.lookbackDays} hari, paruh ${DEFAULT_TRIGGER.halfLifeDays} hari.`}
              />
              {Object.entries(taxonomy.events).map(([type, e]) => (
                <div key={type} className="ds-kv">
                  <span>
                    {eventLabel(type)} <span className="dv-dim">· {e.patterns.length} pola</span>
                  </span>
                  <span className="tnum">
                    {e.direction > 0 ? "+" : e.direction < 0 ? "−" : "±"} · materialitas {dec(e.materiality, 1)}
                  </span>
                </div>
              ))}
              <p className="ds-note" style={{ marginTop: 14 }}>
                Flow: +1 beli / −1 jual × log(1 + nilai) × bobot pemegang (orang dalam {dec(DEFAULT_FLOW.holderWeights.insider, 1)},
                korporasi {dec(DEFAULT_FLOW.holderWeights["corporate-investor"], 1)}, institusi{" "}
                {dec(DEFAULT_FLOW.holderWeights.institution, 1)}) × peluruhan (paruh {DEFAULT_FLOW.halfLifeDays} hari). Placement dan repo
                × {dec(DEFAULT_FLOW.financingWeight)}.
              </p>
            </Glass>
          </div>

          <Glass delay={360} style={{ marginBottom: 20 }}>
            <SectionHead
              title="Cakupan dan arsitektur"
              note="11 dari 12 sektor IDX-IC. Listed Investment Product dikecualikan karena isinya ETF dan kendaraan investasi — return-nya turunan sektor lain dan akan menghasilkan korelasi semu. Subsektor hanya untuk tampilan, tidak untuk skor: menguji ~35 hipotesis akan memunculkan positif palsu karena kebetulan."
            />
            <p className="ds-body">
              Setiap hari bursa pukul 05:00–05:59 WIB — sebelum IDX buka — pipeline mengambil penutupan sesi sebelumnya, berita, dan filing semalam, lalu menghitung satu snapshot harian yang tersedia untuk user mulai 06:00.
              Setiap kunjungan halaman hanya membaca snapshot itu — sectors.app tidak pernah dipanggil saat halaman dibuka. Data
              mentah hanya untuk perhitungan internal; yang ditampilkan dan diekspos lewat API hanya nilai turunan.
            </p>
          </Glass>

          <Glass delay={400}>
            <SectionHead title="Keterbatasan" note="Baca sebelum menarik kesimpulan." />
            <ol className="ds-steps" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
              {LIMITS.map((l, i) => (
                <li key={l.title}>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <strong>{l.title}</strong>
                  <p>{l.body}</p>
                </li>
              ))}
            </ol>
          </Glass>
        </main>
        <Footer snapshot={snapshot} />
      </div>
    </>
  );
}
