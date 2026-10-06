import type { Metadata } from "next";
import Link from "next/link";
import LandingHeader from "./components/LandingHeader";
import { BACKDROP_VIDEO, BrandMark } from "./components/ui";
import { loadSnapshot } from "./lib/data";
import { dateLabel, dec, eventLabel, timeLabel } from "./lib/format";
import { ATTENTION_MAX } from "./components/score";
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
              <span className="vt-demo-smoke" role="img" aria-label="Asap abstrak merah dan biru" />
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

      <Info snapshot={snapshot} />
    </main>
  );
}

const COMPONENTS = [
  {
    name: "Eksposur",
    range: "0 – 1",
    text: "Porsi kapitalisasi sektor yang terhubung secara struktural ke SGX — anak usaha, induk, atau pemegang saham Singapura.",
  },
  {
    name: "Sensitivitas",
    range: "0 – 1",
    text: "Seberapa kuat return SGX kemarin memprediksi sektor ini secara historis, setelah koreksi Benjamini–Hochberg.",
  },
  {
    name: "Flow",
    range: "−1 – 1",
    text: "Arah transaksi orang dalam 30 hari terakhir: komisaris, direksi, dan pemegang saham signifikan.",
  },
  {
    name: "Pemicu",
    range: "−1 – 1",
    text: "Berita dan pengumuman emiten SGX terkait dalam 3 hari terakhir — peringatan laba, aksi korporasi, dan sejenisnya.",
  },
];

const STEPS = [
  { title: "Data penutupan masuk", text: "Harga, berita, dan laporan orang dalam IDX + SGX diambil dari sectors.app setelah pasar tutup." },
  { title: "Skor dihitung sebelum pasar buka", text: "Setiap pagi, 11 sektor diberi skor perhatian dan diuji ulang terhadap riwayat lead-lag SGX." },
  { title: "Kamu cek yang teratas", text: "Peringkat, ringkasan pagi, dan rincian tiap sektor siap dibaca sebelum sesi pertama dimulai." },
];

type Snap = Awaited<ReturnType<typeof loadSnapshot>>;

function Info({ snapshot }: { snapshot: Snap }) {
  const top = snapshot?.sectors.slice(0, 3) ?? [];
  const v = snapshot?.validation;

  return (
    <div className="vt-info">
      <section className="vt-section vt-intro">
        <p className="vt-eyebrow">Apa itu Aida</p>
        <h2 className="vt-h2">Satu skor perhatian untuk 11 sektor IDX.</h2>
        <p className="vt-lead">
          Banyak emiten IDX terhubung ke perusahaan yang tercatat di Singapura. Aida mengukur seberapa kuat hubungan itu,
          apakah secara historis SGX benar-benar mendahului IDX, dan apa yang sedang terjadi hari ini — lalu mengurutkan
          sektor mana yang paling layak diriset dulu.
        </p>
        <div className="vt-stats">
          <div>
            <b className="tnum">11</b>
            <span>sektor IDX dipantau</span>
          </div>
          <div>
            <b className="tnum">{v ? `${v.significant}/11` : "—"}</b>
            <span>sektor lolos uji lead-lag SGX</span>
          </div>
          <div>
            <b className="tnum">{v ? v.history.days : "—"}</b>
            <span>hari bursa dalam riwayat</span>
          </div>
        </div>
      </section>

      <section className="vt-section">
        <p className="vt-eyebrow">Cara skor dihitung</p>
        <h2 className="vt-h2">Empat komponen, satu perkalian.</h2>
        <p className="vt-formula">Perhatian = Eksposur × (0,5 + Sensitivitas) × (1 + Flow + Pemicu)</p>
        <div className="vt-cards">
          {COMPONENTS.map((c, i) => (
            <article key={c.name} className="vt-glass vt-card">
              <span className="vt-card-num tnum">0{i + 1}</span>
              <h3>{c.name}</h3>
              <small className="tnum">{c.range}</small>
              <p>{c.text}</p>
            </article>
          ))}
        </div>
        <Link className="vt-text-link" href="/methodology#rumus">
          Baca metodologi lengkap →
        </Link>
      </section>

      <section className="vt-section">
        <p className="vt-eyebrow">{snapshot ? `Teratas · ${dateLabel(snapshot.date)}` : "Teratas hari ini"}</p>
        <h2 className="vt-h2">Sektor yang paling layak dicek.</h2>
        {top.length ? (
          <ol className="vt-top">
            {top.map((s) => (
              <li key={s.slug}>
                <Link className="vt-glass vt-top-row" href={`/sector/${s.slug}`}>
                  <span className="vt-top-rank tnum">{s.rank}</span>
                  <span className="vt-top-name">{s.name}</span>
                  <span className="vt-top-bar" aria-hidden="true">
                    <i style={{ width: `${Math.min(1, s.attention / ATTENTION_MAX) * 100}%` }} />
                  </span>
                  <b className="tnum">{dec(s.attention)}</b>
                  <span className="vt-top-trigger">
                    {s.trigger.events.length ? eventLabel(s.trigger.events[0].type) : "Tanpa pemicu"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="vt-lead">Belum ada snapshot. Peringkat muncul setelah backfill pertama dijalankan.</p>
        )}
        <Link className="vt-white-btn" href="/dashboard">
          Lihat 11 sektor
          <span className="vt-arrow-box vt-arrow-box--inline" aria-hidden="true">
            <svg viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </section>

      <section className="vt-section">
        <p className="vt-eyebrow">Ritme harian</p>
        <h2 className="vt-h2">Siap sebelum bel pembukaan.</h2>
        <ol className="vt-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="tnum">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="vt-section">
        <div className="vt-glass vt-disclaimer">
          <h2>Bukan nasihat investasi</h2>
          <p>
            Aida adalah alat riset internal. Skor perhatian menunjukkan ke mana riset sebaiknya diarahkan — bukan apa yang
            harus dibeli atau dijual. Hubungan historis bisa berhenti berlaku, dan keyakinan tiap sektor ditampilkan
            terpisah dari skornya.
          </p>
        </div>
      </section>

      <footer className="vt-footer">
        <div className="vt-footer-brand">
          <Link href="/" className="vt-footer-logo" aria-label="Beranda Aida">
            <BrandMark />
            <b>Aida</b>
          </Link>
          <p>Pantau sektor IDX yang bergerak di luar perkiraan pasar Asia.</p>
        </div>
        <nav className="vt-footer-nav" aria-label="Footer">
          <Link href="/dashboard">Peringkat</Link>
          <Link href="/sector/industrials">Sektor</Link>
          <Link href="/methodology">Metodologi</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <div className="vt-footer-base">
          <span>Sumber data: sectors.app — hanya nilai turunan yang ditampilkan.</span>
          <span>© 2026 Aida · Bukan nasihat investasi.</span>
        </div>
      </footer>
    </div>
  );
}
