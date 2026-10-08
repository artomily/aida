import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import LandingHeader from "./components/LandingHeader";
import { loadExposureGraph } from "../data/load";
import { DEFAULT_FLOW } from "../scoring/flow";
import { DEFAULT_TRIGGER } from "../scoring/trigger";
import type { Snapshot } from "../scoring/types";
import PixelField from "./components/PixelField";
import { PixelIcon, SegBar, heatLevel, type PixelIconName } from "./components/pixel";
import { ATTENTION_MAX } from "./components/score";
import { BACKDROP_VIDEO } from "./components/ui";
import { loadSnapshot } from "./lib/data";
import { ago, bare, dateLabel, dec, eventLabel, pct, timeLabel } from "./lib/format";
import "./landing.css";

export const metadata: Metadata = {
  title: "Aida — Berhenti menebak sektor yang bergerak",
  description: "Satu skor perhatian untuk 11 sektor IDX, dari keterkaitan SGX, sensitivitas historis, aliran orang dalam, dan pemicu berita.",
};

export default async function Landing() {
  const snapshot = await loadSnapshot();
  const stamp = snapshot ? `${timeLabel(snapshot.generatedAt)} WIB  •  ${dateLabel(snapshot.date)}` : "Belum ada snapshot";

  return (
    <main className="vt-page">
      <section className="vt-screen" id="screen">
        <video className="vt-background" autoPlay muted loop playsInline disablePictureInPicture aria-hidden="true">
          <source src={BACKDROP_VIDEO} type="video/mp4" />
        </video>

        <LandingHeader stamp={stamp} />

        <section className="vt-hero">
          <div className="vt-hero-content">
            <h1 className="vt-hero-title">
              <span className="vt-line vt-line-one">
                <span className="vt-line-reveal">Berhenti Menebak</span>
              </span>
              <span className="vt-line vt-line-two">
                <span className="vt-line-reveal">Sektor yang Bergerak.</span>
              </span>
            </h1>
            <p className="vt-hero-copy">
              Sinyal sektor IDX tersebar di SGX, transaksi orang dalam,
              <br /> dan berita. Aida merangkumnya jadi satu skor perhatian,
              <br /> supaya tiap pagi kamu tahu sektor mana yang dicek dulu.
            </p>
            <Link className="vt-primary-cta" href="/dashboard">
              <span className="vt-label">Lihat Skor</span>
              <span className="vt-arrow-box" aria-hidden="true">
                <svg viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </div>

          <article className="vt-demo-card">
            <div className="vt-demo-visual">
              <PixelField className="vt-demo-smoke" cell={[3, 7]} heat={1.15} seed={3} />
              <Link className="vt-play" href="/methodology#rumus" aria-label="Lihat cara skor dihitung">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M5 3.2v9.6L12.6 8z" fill="#fff" />
                </svg>
              </Link>
            </div>
            <Link className="vt-watch-button" href="/methodology">
              Cara Membaca
            </Link>
          </article>
        </section>
      </section>

      <Ticker snapshot={snapshot} />
      <Info snapshot={snapshot} />
    </main>
  );
}


/* ════════ below the fold ════════ */

const Arrow = () => (
  <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function SectionHead({ n, eyebrow, title, lead }: { n: string; eyebrow: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <header className="px-head">
      <p className="px-eyebrow">
        <span className="px-num">{n}</span>
        <i aria-hidden="true" />
        {eyebrow}
      </p>
      <div className="px-head-grid">
        <h2 className="px-h2">{title}</h2>
        {lead && <p className="px-lead">{lead}</p>}
      </div>
    </header>
  );
}

/** LED ticker under the hero: every sector's score, then the morning's clock. */
function Ticker({ snapshot }: { snapshot: Snapshot | null }) {
  const items = [
    ...(snapshot?.sectors.map((s) => ({
      key: s.slug,
      text: `${s.name} ${dec(s.attention)}`,
      hot: s.rank <= 3,
      icon: (s.trigger.events.length ? "bolt" : "dot") as PixelIconName,
    })) ?? []),
    { key: "sgx", text: "SGX buka 08:00 WIB", hot: false, icon: "clock" as PixelIconName },
    { key: "idx", text: "IDX buka 09:00 WIB", hot: false, icon: "clock" as PixelIconName },
  ];
  const run = (dup: boolean) => (
    <ul className="px-ticker-run" aria-hidden={dup || undefined}>
      {items.map((it) => (
        <li key={it.key} data-hot={it.hot || undefined}>
          <PixelIcon name={it.icon} />
          {it.text}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="px-ticker" role="marquee" aria-label="Skor perhatian per sektor">
      <div className="px-ticker-track">
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}

const COMPONENTS: { name: string; icon: PixelIconName; range: string; what: string; source: string }[] = [
  {
    name: "Eksposur",
    icon: "link",
    range: "0 – 1",
    what: "Porsi kapitalisasi sektor yang terhubung secara struktural ke SGX: induk, anak usaha, pemegang saham, atau jalur komoditas.",
    source: "Graf hubungan SGX ↔ IDX yang dikurasi",
  },
  {
    name: "Sensitivitas",
    icon: "pulse",
    range: "0 – 1",
    what: "Seberapa kuat return SGX kemarin memprediksi return sektor hari ini, dikalikan stabilitasnya di jendela bergulir.",
    source: "Regresi T+1, koreksi Benjamini–Hochberg",
  },
  {
    name: "Flow",
    icon: "flow",
    range: "0 – 1",
    what: "Intensitas transaksi orang dalam: komisaris, direksi, dan pemegang saham signifikan. Placement dan repo diberi bobot kecil.",
    source: `Filing kepemilikan ${DEFAULT_FLOW.lookbackDays} hari, paruh waktu ${DEFAULT_FLOW.halfLifeDays} hari`,
  },
  {
    name: "Pemicu",
    icon: "bolt",
    range: "0 – 1",
    what: "Berita emiten SGX yang terhubung: peringatan laba, akuisisi, divestasi, dividen, kebijakan ekspor, isu regulasi.",
    source: `Berita ${DEFAULT_TRIGGER.lookbackDays} hari, paruh waktu ${DEFAULT_TRIGGER.halfLifeDays} hari`,
  },
];

const FAQ = [
  {
    q: "Apakah skor tinggi berarti saya harus beli?",
    a: "Tidak. Skor perhatian hanya menunjukkan sektor mana yang paling layak diriset dulu pagi ini. Ia tidak mengatakan arah harga, tidak memberi target, dan bukan nasihat investasi.",
  },
  {
    q: "Kenapa SGX?",
    a: "Lebih dari 20 perusahaan SGX beroperasi utama di Indonesia, dan beberapa emiten besar IDX dikendalikan entitas Singapura. SGX juga buka satu jam lebih awal dalam WIB, jadi berita dan pergerakannya sering sampai lebih dulu.",
  },
  {
    q: "Kenapa ada sektor yang skornya nol?",
    a: "Rumusnya perkalian. Kalau sebuah sektor tidak punya hubungan struktural ke SGX (eksposur nol), skornya nol walaupun ada berita atau transaksi orang dalam. Ini disengaja: Aida hanya menilai jalur SGX → IDX.",
  },
  {
    q: "Dari mana datanya, dan seberapa sering diperbarui?",
    a: "Harga penutupan harian IDX dan SGX, berita, dan filing kepemilikan dari sectors.app. Snapshot dihitung sekali tiap hari bursa pukul 05:00–05:59 WIB; beta diestimasi ulang tiap Senin. Hanya nilai turunan yang ditampilkan.",
  },
  {
    q: "Apa batasan terbesarnya?",
    a: "Jendela prediktifnya sempit: setelah 09:00 WIB kedua pasar berjalan paralel. Return sektor dihitung dari emiten terbesar sebagai proksi indeks. Graf hubungan SGX ↔ IDX disusun manual dan belum lengkap. Baca metodologi untuk daftar lengkapnya.",
  },
];

const TIMELINE = [
  { at: 5, label: "05:00", title: "Pipeline jalan", text: "Penutupan kemarin, berita, dan filing semalam ditarik." },
  { at: 6, label: "06:00", title: "Snapshot siap", text: "Peringkat dan ringkasan pagi bisa dibaca." },
  { at: 8, label: "08:00", title: "SGX buka", text: "Satu jam keunggulan sebelum IDX." },
  { at: 9, label: "09:00", title: "IDX buka", text: "Kedua pasar berjalan paralel." },
];

function Info({ snapshot }: { snapshot: Snapshot | null }) {
  const graph = loadExposureGraph();
  const rels = graph.relationships;
  const sgxEntities = new Set(rels.map((r) => r.sgxEntity)).size;
  const idxEmiten = new Set(rels.flatMap((r) => (r.idxSymbol ? [r.idxSymbol] : []))).size;
  const v = snapshot?.validation;
  const sectors = snapshot?.sectors ?? [];
  const now = snapshot ? Date.parse(snapshot.generatedAt) : 0;

  const events = sectors
    .flatMap((s) => s.trigger.events.map((e) => ({ ...e, sector: s.name })))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((e, i, all) => all.findIndex((o) => o.newsId === e.newsId) === i)
    .slice(0, 5);
  const flow = sectors.reduce(
    (t, s) => ({ count: t.count + s.flow.count, buys: t.buys + s.flow.buys, sells: t.sells + s.flow.sells, financing: t.financing + s.flow.financing }),
    { count: 0, buys: 0, sells: 0, financing: 0 },
  );
  const holders = [...new Set(sectors.flatMap((s) => s.flow.linkedHolders))];

  const tests = [
    {
      key: "t1",
      title: "SGX → IDX, T+1",
      note: "Yang dipakai skor",
      on: (s: Snapshot["sectors"][number]) => s.sensitivity.significant,
    },
    {
      key: "rev",
      title: "IDX → SGX, arah balik",
      note: "Kalau ikut signifikan, itu bukan lead-lag",
      on: (s: Snapshot["sectors"][number]) => s.sensitivity.reverse.significant,
    },
    {
      key: "t0",
      title: "Hari yang sama, T+0",
      note: "Hanya co-movement — tidak dipakai",
      on: (s: Snapshot["sectors"][number]) => !!s.sensitivity.sameDay?.significant,
    },
  ];

  return (
    <div className="px-info">
      {/* 01 — the problem */}
      <section className="px-section px-reveal">
        <SectionHead
          n="01"
          eyebrow="Kenapa Aida"
          title={<>Sinyal sektor IDX sering datang dari Singapura.</>}
          lead={
            <>
              Banyak emiten IDX dikendalikan, dimiliki, atau berdagang dengan perusahaan yang tercatat di SGX. Aida memetakan
              hubungan itu, menguji apakah SGX benar-benar mendahului IDX, lalu menimbang apa yang terjadi semalam.
            </>
          }
        />
        <div className="px-led-panel px-frame">
          <PixelField className="px-led-canvas" cell={[5, 12]} heat={0.85} seed={1} />
          <div className="px-led-stats">
            <div>
              <b>{rels.length}</b>
              <span>hubungan SGX ↔ IDX dipetakan</span>
            </div>
            <div>
              <b>{sgxEntities}</b>
              <span>entitas SGX · {idxEmiten} emiten IDX</span>
            </div>
            <div>
              <b>{v ? `${v.significant}/11` : "—"}</b>
              <span>sektor lolos uji lead-lag</span>
            </div>
            <div>
              <b>{v ? v.history.days : "—"}</b>
              <span>hari bursa riwayat</span>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — the board */}
      <section className="px-section px-reveal">
        <SectionHead
          n="02"
          eyebrow={snapshot ? `Papan sinyal · ${dateLabel(snapshot.date)}` : "Papan sinyal"}
          title={<>Sebelas sektor, empat sinyal, satu skor.</>}
          lead={
            <>
              Tiap piksel adalah intensitas satu komponen, 0 sampai 1. Sektor baru naik ke atas kalau terhubung ke SGX
              <em> dan </em>
              punya alasan untuk bergerak hari ini.
            </>
          }
        />
        {sectors.length ? (
          <div className="px-board px-frame">
            <div className="px-board-scroll">
              <table className="px-matrix">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Sektor</th>
                    {COMPONENTS.map((c) => (
                      <th scope="col" key={c.name}>
                        <PixelIcon name={c.icon} />
                        {c.name}
                      </th>
                    ))}
                    <th scope="col">Perhatian</th>
                  </tr>
                </thead>
                <tbody>
                  {sectors.map((s) => {
                    const cells = [
                      { v: s.exposure.score, text: pct(s.exposure.score) },
                      { v: s.sensitivity.score, text: s.sensitivity.beta === null ? "—" : `β ${dec(s.sensitivity.beta)}`, star: s.sensitivity.significant },
                      { v: s.flow.intensity, text: s.flow.count ? `${s.flow.count} tx` : "—" },
                      { v: s.trigger.intensity, text: s.trigger.events.length ? `${s.trigger.events.length} berita` : "—" },
                    ];
                    return (
                      <tr key={s.slug}>
                        <td className="px-rank">{String(s.rank).padStart(2, "0")}</td>
                        <th scope="row">
                          <Link href={`/sector/${s.slug}`}>{s.name}</Link>
                        </th>
                        {cells.map((c, i) => (
                          <td key={i}>
                            <span className="px-cell" data-l={heatLevel(c.v)} title={`${COMPONENTS[i].name}: ${dec(c.v)}`}>
                              {c.text}
                              {c.star && <sup aria-label="signifikan">✱</sup>}
                            </span>
                          </td>
                        ))}
                        <td>
                          <span className="px-attn">
                            <SegBar value={s.attention} max={ATTENTION_MAX} segments={14} />
                            <b>{dec(s.attention)}</b>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-legend">
              <span>Intensitas</span>
              <span className="px-legend-ramp" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((l) => (
                  <i key={l} className="px-cell" data-l={l} />
                ))}
              </span>
              <span>0 → 1</span>
              <span className="px-legend-sep">✱ beta signifikan setelah koreksi BH</span>
              {snapshot?.mode === "mock" && <span className="px-legend-mock">Data sintetis dari server mock — bukan data pasar</span>}
            </div>
          </div>
        ) : (
          <p className="px-lead">Belum ada snapshot. Papan muncul setelah backfill pertama dijalankan.</p>
        )}
        <Link className="px-btn" href="/dashboard">
          Buka papan lengkap
          <span className="px-btn-box" aria-hidden="true">
            <Arrow />
          </span>
        </Link>
      </section>

      {/* 03 — the formula */}
      <section className="px-section px-reveal">
        <SectionHead
          n="03"
          eyebrow="Cara skor dihitung"
          title={<>Perkalian, bukan rata-rata.</>}
          lead={
            <>
              Satu komponen yang kuat tidak cukup. Tanpa jalur ke SGX, berita sebesar apa pun tidak menaikkan skor. Keyakinan
              (korelasi bergulir 60 hari) ditampilkan terpisah dan tidak ikut dikalikan.
            </>
          }
        />
        <p className="px-formula" aria-label="Perhatian sama dengan Eksposur kali, nol koma lima tambah Sensitivitas, kali, satu tambah Flow tambah Pemicu">
          <span className="px-chip px-chip--out">Perhatian</span>
          <span className="px-op">=</span>
          <span className="px-chip">
            <PixelIcon name="link" />
            Eksposur
          </span>
          <span className="px-op">×</span>
          <span className="px-op">(0,5 +</span>
          <span className="px-chip">
            <PixelIcon name="pulse" />
            Sensitivitas
          </span>
          <span className="px-op">)</span>
          <span className="px-op">×</span>
          <span className="px-op">(1 +</span>
          <span className="px-chip">
            <PixelIcon name="flow" />
            Flow
          </span>
          <span className="px-op">+</span>
          <span className="px-chip">
            <PixelIcon name="bolt" />
            Pemicu
          </span>
          <span className="px-op">)</span>
        </p>
        <div className="px-cards">
          {COMPONENTS.map((c, i) => (
            <article key={c.name} className="px-card px-frame">
              <div className="px-card-top">
                <PixelIcon name={c.icon} className="px-icon--lg" />
                <span className="px-num">0{i + 1}</span>
              </div>
              <h3>{c.name}</h3>
              <p>{c.what}</p>
              <dl>
                <div>
                  <dt>Rentang</dt>
                  <dd>{c.range}</dd>
                </div>
                <div>
                  <dt>Sumber</dt>
                  <dd>{c.source}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <p className="px-foot">
          Skor maksimum {dec(ATTENTION_MAX, 1)} = 1 × (0,5 + 1) × (1 + 1 + 1).{" "}
          <Link className="px-text-link" href="/methodology#rumus">
            Baca metodologi lengkap →
          </Link>
        </p>
      </section>

      {/* 04 — this morning */}
      {snapshot && (
        <section className="px-section px-reveal">
          <SectionHead n="04" eyebrow={`Pagi ini · snapshot ${timeLabel(snapshot.generatedAt)} WIB`} title={<>Apa yang berubah semalam.</>} />
          <div className="px-today">
            <article className="px-brief px-frame">
              <p className="px-label">
                <PixelIcon name="dot" />
                Ringkasan pagi · {snapshot.brief.by === "llm" ? "disusun model bahasa dari skor" : "disusun otomatis dari skor"}
              </p>
              <blockquote>{snapshot.brief.text}</blockquote>
            </article>

            <article className="px-feed px-frame">
              <p className="px-label">
                <PixelIcon name="bolt" />
                Pemicu terbaru · berita SGX {DEFAULT_TRIGGER.lookbackDays} hari
              </p>
              {events.length ? (
                <ul>
                  {events.map((e) => (
                    <li key={e.newsId}>
                      <PixelIcon name={e.direction > 0 ? "up" : e.direction < 0 ? "down" : "dot"} className={`px-dir px-dir--${e.direction}`} />
                      <span>
                        <b>{eventLabel(e.type)}</b> · {bare(e.entity)}
                        <small>
                          {e.sector} · {ago(e.publishedAt, now)}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-empty">Tidak ada berita SGX terkait dalam {DEFAULT_TRIGGER.lookbackDays} hari terakhir.</p>
              )}
            </article>

            <article className="px-flow px-frame">
              <p className="px-label">
                <PixelIcon name="flow" />
                Orang dalam · {DEFAULT_FLOW.lookbackDays} hari
              </p>
              <div className="px-flow-nums">
                <div>
                  <b>{flow.count}</b>
                  <span>transaksi</span>
                </div>
                <div>
                  <b className="px-up">{flow.buys}</b>
                  <span>beli</span>
                </div>
                <div>
                  <b className="px-down">{flow.sells}</b>
                  <span>jual</span>
                </div>
              </div>
              <SegBar value={flow.buys} max={Math.max(1, flow.buys + flow.sells)} segments={20} label={`${flow.buys} beli dari ${flow.buys + flow.sells} transaksi beli/jual`} />
              <p className="px-small">
                {flow.financing ? `${flow.financing} placement/repo dihitung dengan bobot kecil. ` : ""}
                {holders.length ? `Pemegang terkait SGX: ${holders.slice(0, 3).join(", ")}.` : "Belum ada pemegang terkait SGX yang bertransaksi."}
              </p>
            </article>
          </div>
        </section>
      )}

      {/* 05 — honest testing */}
      {v && (
        <section className="px-section px-reveal">
          <SectionHead
            n="05"
            eyebrow="Uji yang jujur"
            title={<>Kami menguji keterkaitannya, bukan mengasumsikannya.</>}
            lead={
              <>
                Setiap sektor diuji tiga arah. Hanya T+1 — SGX kemarin terhadap IDX hari ini — yang masuk skor, setelah koreksi
                Benjamini–Hochberg di α {dec(v.alpha)} atas 11 sektor.
              </>
            }
          />
          <div className="px-tests px-frame">
            {tests.map((t) => {
              const hits = sectors.filter(t.on);
              return (
                <div key={t.key} className="px-test">
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.note}</p>
                  </div>
                  <span className="px-dots" role="img" aria-label={`${hits.length} dari 11 sektor signifikan${hits.length ? `: ${hits.map((s) => s.name).join(", ")}` : ""}`}>
                    {sectors.map((s) => (
                      <i key={s.slug} data-on={t.on(s) || undefined} title={s.name} />
                    ))}
                  </span>
                  <b className="px-count">
                    {hits.length}
                    <small>/11</small>
                  </b>
                </div>
              );
            })}
            <p className="px-small px-tests-foot">
              Riwayat {v.history.days} hari bursa ({v.history.from ?? "—"} s/d {v.history.to ?? "—"}) · jendela {v.window} hari ·
              stabilitas = porsi jendela bergulir dengan tanda β yang sama
              {v.ownershipMatches.length
                ? ` · ${v.ownershipMatches.length} entitas SGX juga muncul sebagai pemegang saham di filing IDX (mis. ${v.ownershipMatches[0].holderName} → ${bare(v.ownershipMatches[0].symbol)}).`
                : "."}
            </p>
          </div>
        </section>
      )}

      {/* 06 — daily rhythm */}
      <section className="px-section px-reveal">
        <SectionHead
          n="06"
          eyebrow="Ritme harian"
          title={<>Siap sebelum bel pembukaan.</>}
          lead={<>Snapshot dihitung sekali tiap hari bursa, sebelum IDX buka. Beta diestimasi ulang tiap Senin pukul 04:00 WIB.</>}
        />
        <div className="px-timeline px-frame">
          <div className="px-time-track" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => {
              const h = 4 + i / 4;
              const zone = h >= 9 ? "live" : h >= 8 ? "sgx" : h >= 6 ? "ready" : h >= 5 ? "run" : "off";
              return <i key={i} data-zone={zone} />;
            })}
          </div>
          <ol className="px-time-marks">
            {TIMELINE.map((t) => (
              <li key={t.label} style={{ "--x": `${((t.at - 4) / 6) * 100}%` } as CSSProperties}>
                <span className="px-num">{t.label}</span>
                <b>{t.title}</b>
                <small>{t.text}</small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 07 — FAQ */}
      <section className="px-section px-reveal">
        <SectionHead n="07" eyebrow="Pertanyaan umum" title={<>Sebelum kamu mulai.</>} />
        <div className="px-faq">
          {FAQ.map((f) => (
            <details key={f.q} className="px-frame">
              <summary>
                {f.q}
                <span className="px-plus" aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* disclaimer */}
      <section className="px-section px-reveal">
        <div className="px-warn px-frame">
          <PixelIcon name="warn" className="px-icon--lg" />
          <div>
            <h2>Bukan nasihat investasi</h2>
            <p>
              Aida adalah alat riset internal. Skor perhatian menunjukkan ke mana riset sebaiknya diarahkan — bukan apa yang
              harus dibeli atau dijual. Hubungan historis bisa berhenti berlaku kapan saja.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-footer">
        <div className="px-footer-word">
          <PixelField className="px-footer-canvas" cell={[6, 14]} gap={2} heat={0.55} word="AIDA" seed={7} />
          <span className="px-sr">Aida</span>
        </div>
        <div className="px-footer-cols">
          <div className="px-footer-about">
            <p>Pantau sektor IDX yang bergerak di luar perkiraan pasar Asia.</p>
            <Link className="px-btn" href="/dashboard">
              Lihat skor hari ini
              <span className="px-btn-box" aria-hidden="true">
                <Arrow />
              </span>
            </Link>
          </div>
          <nav aria-label="Produk">
            <p className="px-label">Produk</p>
            <Link href="/dashboard">Peringkat</Link>
            <Link href="/sector/industrials">Sektor</Link>
            <Link href="/methodology">Metodologi</Link>
          </nav>
          <nav aria-label="Lainnya">
            <p className="px-label">Lainnya</p>
            <Link href="/methodology#rumus">Rumus skor</Link>
            <Link href="/admin">Admin</Link>
          </nav>
          <div>
            <p className="px-label">Snapshot</p>
            <p className="px-small">{snapshot ? `${dateLabel(snapshot.date)} · ${timeLabel(snapshot.generatedAt)} WIB` : "Belum ada"}</p>
            <p className="px-small">Data: sectors.app</p>
          </div>
        </div>
        <div className="px-footer-base">
          <span>Hanya nilai turunan (skor, beta, bobot, jumlah) yang ditampilkan.</span>
          <span>© 2026 Aida · Bukan nasihat investasi</span>
        </div>
      </footer>
    </div>
  );
}
