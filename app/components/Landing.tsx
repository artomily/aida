"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Header from "./Header";
import { NEG, POS, SECTORS, fmt, fmtZ, statusOf } from "../lib/model";
import {
  Arrow,
  BookIcon,
  Cta,
  Glass,
  GridIcon,
  GuidePill,
  InfoIcon,
  MeterPanel,
  QuestionIcon,
  ShieldIcon,
  SplitBar,
  StatRow,
  StatusBadge,
  TargetIcon,
} from "./ui";

const POSTER =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_105822_bf7c2d53-9957-4521-bbbf-7c1ab7a70130.png";
const CLIP =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_105953_21ad8049-9088-4a00-bad3-aee6b5575a2b.mp4";

// Today's board, straight from the same data the dashboard reads — the landing never invents a figure.
const RANKED = SECTORS.map((s) => ({ ...s, r: +(s.a - s.e).toFixed(2), status: statusOf(s.z) })).sort(
  (a, b) => Math.abs(b.z) - Math.abs(a.z),
);
const UNUSUAL = RANKED.filter((s) => s.status === "DIVERGENT");
const TOP = RANKED[0];
// Prose reads in Indonesian decimals ("1,24%"); the board preview keeps the dashboard's own format.
const id = (s: string) => s.replace(".", ",");
const pct = (v: number) => id(fmt(Math.abs(v)).replace(/^[+−]/, ""));
const move = (v: number) => (v > 0 ? "naik" : v < 0 ? "turun" : "datar");

const STEPS = [
  {
    time: "06:30",
    title: "Model belajar ulang",
    body: "Sebelum pasar buka, model membaca 120 hari terakhir: bagaimana tiap sektor IDX biasanya ikut bursa Asia, Wall Street, rupiah, minyak, dan batu bara.",
  },
  {
    time: "09:00",
    title: "Perkiraan dibuat",
    body: "Begitu Nikkei, KOSPI, dan TAIEX bergerak, model memperkirakan seberapa jauh tiap sektor IDX seharusnya naik atau turun di jam pertama.",
  },
  {
    time: "10:04",
    title: "Kejutan ditandai",
    body: "Gerak sebenarnya dibandingkan dengan perkiraan. Sektor yang meleset jauh dari biasanya diberi tanda — lengkap dengan perusahaan penggeraknya.",
  },
];

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <InfoIcon />,
    title: "Ringkasan pagi, bahasa manusia",
    body: "Satu paragraf yang menjelaskan apa yang terjadi dan kenapa — tanpa perlu membaca tabel dulu.",
  },
  {
    icon: <TargetIcon />,
    title: "Skor “seberapa tidak biasa”",
    body: "Satu angka per sektor. 0 artinya wajar, 2 ke atas artinya jarang terjadi — kira-kira sekali dalam 20 hari.",
  },
  {
    icon: <GridIcon />,
    title: "Siapa penggeraknya",
    body: "Lihat 8 perusahaan terbesar di tiap sektor dan seberapa besar masing-masing mendorong kejutan hari ini.",
  },
  {
    icon: <ShieldIcon />,
    title: "Laporan emiten sekali klik",
    body: "Harga, volume, arus dana asing, dan catatan sesi untuk perusahaan yang sedang bergerak.",
  },
  {
    icon: <QuestionIcon />,
    title: "Tahu kapan model lemah",
    body: "Grafik keterkaitan dengan pasar Asia memberi tahu kapan perkiraan bisa dipegang — dan kapan sebaiknya ragu.",
  },
  {
    icon: <BookIcon />,
    title: "Cara kerja terbuka",
    body: "Rumus, data, tingkat ketepatan, sampai daftar keterbatasan — semua bisa dibaca, tidak ada kotak hitam.",
  },
];

const AUDIENCE = [
  {
    who: "Trader harian",
    body: "Dapatkan daftar pendek sektor yang layak diperhatikan sebelum sesi pertama selesai, bukan setelah semua orang tahu.",
  },
  {
    who: "Analis & tim riset",
    body: "Pisahkan gerak yang sekadar ikut pasar global dari cerita lokal yang layak digali dan ditulis.",
  },
  {
    who: "Investor yang sedang belajar",
    body: "Pahami kenapa sektor bergerak — setiap angka datang dengan penjelasan singkat dalam bahasa sehari-hari.",
  },
];

const FAQ = [
  {
    q: "Apakah ini sinyal beli atau jual?",
    a: "Bukan. Divergence hanya menunjukkan ke mana perhatian sebaiknya diarahkan pagi ini. Tidak ada target harga, saran posisi, atau ramalan arah harga. Keputusan tetap di tangan Anda.",
  },
  {
    q: "Saya tidak paham statistik. Apakah tetap bisa memakainya?",
    a: "Bisa. Setiap halaman dimulai dengan ringkasan dalam kalimat biasa, status berwarna (Tidak biasa, Perlu dipantau, Sesuai perkiraan), dan penjelasan singkat di setiap kolom. Rumusnya ada, tapi tidak wajib dibaca.",
  },
  {
    q: "Datanya dari mana dan kapan diperbarui?",
    a: "Indeks sektor IDX, indeks regional Asia, penutupan AS, kurs, komoditas, dan arus dana asing KSEI. Model diperbarui setiap hari pukul 06:30 WIB; papan siap sekitar 10:04 WIB.",
  },
  {
    q: "Seberapa sering tandanya keliru?",
    a: "Sekitar 18% peringatan ternyata bukan apa-apa, dan kami menampilkan angka itu terang-terangan. Untuk sektor dengan skor 2 ke atas, arah geraknya masih bertahan sampai penutupan pada 74% kasus dalam pengujian 2023–2026.",
  },
  {
    q: "Apakah laporan per perusahaan sudah memakai data asli?",
    a: "Belum sepenuhnya — laporan emiten saat ini masih memakai data contoh dan diberi label jelas. Papan sektor dan metodologinya sudah memakai struktur data final.",
  },
];

export default function Landing() {
  const video = useRef<HTMLVideoElement>(null);

  // Same plate behaviour as the hero comp: hold frame 1 for reduced motion, resume on visibility.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (q.matches) {
        v.pause();
        v.currentTime = 0;
      } else v.play().catch(() => {});
    };
    const onVis = () => !document.hidden && sync();
    q.addEventListener("change", sync);
    document.addEventListener("visibilitychange", onVis);
    v.addEventListener("canplay", sync);
    sync();
    return () => {
      q.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", onVis);
      v.removeEventListener("canplay", sync);
    };
  }, []);

  return (
    <>
      <div className="ds-plate" aria-hidden="true" />

      {/* ── fold ── */}
      <section className="lp-fold">
        <video
          ref={video}
          className="lp-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          poster={POSTER}
          src={CLIP}
        />
        <div className="lp-tint" />

        <div className="ds-shell lp-fold-inner">
          <Header
            items={[
              { label: "Cara kerja", icon: <BookIcon />, href: "#cara-kerja" },
              { label: "Fitur", icon: <GridIcon />, href: "#fitur" },
              { label: "Tanya jawab", icon: <QuestionIcon />, href: "#faq", divider: true },
            ]}
            cta={{ label: "Buka papan hari ini", href: "/dashboard" }}
          />

          <div className="ds-hero lp-hero">
            <div className="ds-enter">
              <p className="ds-eyebrow">Pemantau sektor IDX · setiap pagi bursa</p>
              <h1 className="ds-h1 lp-h1">
                Tahu lebih dulu
                <br />
                sektor mana yang
                <br />
                bergerak aneh
              </h1>
              <div className="ds-tagrow">
                <a className="ds-play" href="#contoh" aria-label="Lihat contoh hari ini">
                  <svg viewBox="0 0 13 14" aria-hidden="true" style={{ width: 13, height: 14 }}>
                    <path d="M1.4 1.3 11.6 7 1.4 12.7z" fill="var(--ink)" />
                  </svg>
                </a>
                <p className="ds-tag">Pasar Asia bilang satu hal. IDX melakukan hal lain. Kami tunjukkan di mana.</p>
              </div>
            </div>

            <MeterPanel
              title="Pagi ini"
              dot={POS}
              icon={<TargetIcon />}
              big={`${UNUSUAL.length} sektor`}
              sub={
                <>
                  bergerak di luar perkiraan
                  <br />
                  dari {SECTORS.length} sektor yang dipantau.
                </>
              }
              scale={["0", "3", "6", "9", "11"]}
              fill={UNUSUAL.length / SECTORS.length}
              label={`${UNUSUAL.length} dari ${SECTORS.length} sektor`}
            />
          </div>

          <div className="ds-statrow" style={{ marginBottom: 0 }}>
            <StatRow
              items={[
                { value: "10:04", label: <>Papan siap,<br />tiap hari bursa</> },
                { value: "11", label: <>Sektor IDX<br />dipantau</> },
              ]}
            />
            <GuidePill href="#contoh">Lihat contoh hari ini</GuidePill>
          </div>
        </div>
      </section>

      <div className="ds-shell lp-body">
        {/* ── problem ── */}
        <section className="lp-section lp-split">
          <div>
            <p className="ds-eyebrow">Masalahnya</p>
            <h2 className="lp-h2">Pasar pagi itu bising.</h2>
          </div>
          <div>
            <p className="ds-body lp-lead">
              Setiap pagi hampir semua sektor IDX bergerak. Sebagian besar hanya ikut arus bursa Asia yang
              buka lebih dulu — itu wajar dan bisa ditebak. Yang menarik adalah sektor yang{" "}
              <em>tidak</em> ikut arus: di situlah biasanya ada kabar lokal yang belum banyak dibaca orang.
            </p>
            <div className="lp-compare">
              <Glass as="div" delay={0} className="lp-compare-card">
                <h3>Tanpa Divergence</h3>
                <ul>
                  <li>Membuka puluhan grafik satu per satu</li>
                  <li>Menebak mana yang “ikut pasar” dan mana yang aneh</li>
                  <li>Baru sadar setelah pergerakannya ramai dibahas</li>
                </ul>
              </Glass>
              <Glass as="div" delay={0} className="lp-compare-card lp-compare-card--good">
                <h3>Dengan Divergence</h3>
                <ul>
                  <li>Satu papan, 11 sektor, siap pukul 10:04</li>
                  <li>Kejutan sudah diurutkan dari yang paling tidak biasa</li>
                  <li>Langsung terlihat perusahaan penggeraknya</li>
                </ul>
              </Glass>
            </div>
          </div>
        </section>

        {/* ── live example ── */}
        <section id="contoh" className="lp-section">
          <div className="lp-head">
            <p className="ds-eyebrow">Contoh nyata · Selasa, 15 Sep 2026</p>
            <h2 className="lp-h2">
              {TOP.name} {move(TOP.a)} {pct(TOP.a)}.
              <br />
              Model memperkirakan {move(TOP.e)} {pct(TOP.e)}.
            </h2>
            <p className="ds-body lp-lead">
              Selisih {id(fmt(TOP.r))} ini tidak bisa dijelaskan oleh bursa Asia — skornya {id(fmtZ(TOP.z))}, kejadian
              yang jarang. Pemicunya harga batu bara, sesuatu yang tidak terlihat dari pasar regional. Begini
              tampilannya di papan:
            </p>
          </div>

          <Glass className="lp-preview">
            <div className="lp-preview-head">
              <span>Sektor</span>
              <span>Perkiraan</span>
              <span>Kenyataan</span>
              <span>Seberapa tidak biasa</span>
              <span>Status</span>
            </div>
            {RANKED.slice(0, 5).map((s) => {
              const col = s.status === "NORMAL" ? undefined : s.r >= 0 ? POS : NEG;
              return (
                <div key={s.slug} className="lp-preview-row tnum">
                  <strong>{s.name}</strong>
                  <span style={{ color: "var(--muted)" }}>{fmt(s.e)}</span>
                  <span style={{ color: col, fontWeight: col ? 560 : 450 }}>
                    <Arrow v={s.r} />
                    {fmt(s.a)}
                  </span>
                  <span className="lp-preview-z">
                    <SplitBar ratio={s.z / 3} faded={s.status === "NORMAL"} />
                    <b style={{ color: col }}>{fmtZ(s.z)}</b>
                  </span>
                  <span>
                    <StatusBadge status={s.status} pos={s.r >= 0} />
                  </span>
                </div>
              );
            })}
            <div className="lp-preview-foot">
              <span>5 dari 11 sektor · diurutkan dari yang paling tidak biasa</span>
              <Cta href="/dashboard">Lihat papan lengkap</Cta>
            </div>
          </Glass>
        </section>

        {/* ── how it works ── */}
        <section id="cara-kerja" className="lp-section">
          <div className="lp-head">
            <p className="ds-eyebrow">Cara kerja</p>
            <h2 className="lp-h2">Tiga langkah, setiap pagi, otomatis.</h2>
          </div>
          <div className="lp-cards lp-cards--3">
            {STEPS.map((s, i) => (
              <Glass key={s.time} delay={i * 60} className="lp-step">
                <span className="ds-num ds-num--sm">{s.time}</span>
                <h3 className="ds-h2">{s.title}</h3>
                <p className="ds-note" style={{ margin: 0 }}>
                  {s.body}
                </p>
              </Glass>
            ))}
          </div>
        </section>

        {/* ── features ── */}
        <section id="fitur" className="lp-section">
          <div className="lp-head">
            <p className="ds-eyebrow">Yang Anda dapat</p>
            <h2 className="lp-h2">Dibuat supaya siapa pun bisa membacanya.</h2>
          </div>
          <div className="lp-cards lp-cards--3">
            {FEATURES.map((f, i) => (
              <Glass key={f.title} delay={(i % 3) * 60} className="lp-feature">
                <span className="ds-badge-icon lp-icon">{f.icon}</span>
                <h3 className="ds-h2">{f.title}</h3>
                <p className="ds-note" style={{ margin: 0 }}>
                  {f.body}
                </p>
              </Glass>
            ))}
          </div>
        </section>

        {/* ── trust ── */}
        <section className="lp-section">
          <Glass className="lp-trust">
            <div>
              <p className="ds-eyebrow">Jujur soal angka</p>
              <h2 className="lp-h2" style={{ fontSize: "clamp(30px, 3.4vw, 44px)" }}>
                Diuji pada data yang belum pernah dilihat model.
              </h2>
              <p className="ds-body" style={{ marginTop: 16 }}>
                Model belajar dari 120 hari, lalu diuji pada 30 hari berikutnya — digeser terus sepanjang
                Januari 2023 sampai Agustus 2026. Kami juga menampilkan sisi kurangnya: sekitar{" "}
                <strong style={{ fontWeight: 560 }}>18% peringatan ternyata keliru</strong>. Karena alat
                yang baik memberi tahu kapan ia bisa salah.
              </p>
            </div>
            <StatRow
              small
              items={[
                { value: "9.240", label: <>Pengamatan<br />diuji ulang</> },
                { value: "74%", label: <>Arah bertahan<br />sampai tutup*</> },
                { value: "1,6", label: <>Sektor ditandai<br />per hari</> },
              ]}
            />
            <p className="ds-note" style={{ margin: 0, gridColumn: "1 / -1" }}>
              *Untuk sektor dengan skor “tidak biasa” 2 ke atas. Bukan jaminan hasil di masa depan.
            </p>
          </Glass>
        </section>

        {/* ── audience ── */}
        <section className="lp-section">
          <div className="lp-head">
            <p className="ds-eyebrow">Untuk siapa</p>
            <h2 className="lp-h2">Satu papan, banyak cara memakainya.</h2>
          </div>
          <div className="lp-cards lp-cards--3">
            {AUDIENCE.map((a, i) => (
              <Glass key={a.who} delay={i * 60}>
                <h3 className="ds-h2" style={{ marginBottom: 10 }}>
                  {a.who}
                </h3>
                <p className="ds-note" style={{ margin: 0 }}>
                  {a.body}
                </p>
              </Glass>
            ))}
          </div>
        </section>

        {/* ── faq ── */}
        <section id="faq" className="lp-section lp-split">
          <div>
            <p className="ds-eyebrow">Tanya jawab</p>
            <h2 className="lp-h2">Yang sering ditanyakan.</h2>
          </div>
          <Glass className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <i aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </Glass>
        </section>

        {/* ── final call ── */}
        <section className="lp-final ds-enter" style={{ "--d": "0ms" } as CSSProperties}>
          <div>
            <h2>Mulai besok pagi dengan tahu ke mana harus melihat.</h2>
            <p>Papan hari ini sudah siap. Tidak perlu daftar untuk melihatnya.</p>
          </div>
          <Cta variant="glass" href="/dashboard">
            Buka papan hari ini
          </Cta>
        </section>

        <footer className="ds-footer">
          <span>© 2026 Divergence · Riset pasar IDX</span>
          <span>Bukan nasihat investasi. Keputusan investasi sepenuhnya tanggung jawab Anda.</span>
        </footer>
      </div>
    </>
  );
}
