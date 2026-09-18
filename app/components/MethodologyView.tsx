import type { View } from "../lib/model";
import { Cta, Glass, Hero, Meter, MeterPanel, SectionHead, ShieldIcon, StatRow } from "./ui";

const sub = { color: "var(--muted)", fontSize: "0.72em" };

const SPEC = [
  { label: "Metode", value: "Regresi OLS, HAC (Newey–West, 5 jeda)" },
  { label: "Data yang dipelajari", value: "120 hari bursa terakhir, bergulir" },
  { label: "Yang diperkirakan", value: "Return sektor 09:00–10:00 WIB" },
  { label: "Model diperbarui", value: "Setiap hari, 06:30 WIB" },
  { label: "Cakupan", value: "11 indeks sektor IDX-IC" },
];

const CONTROLS = [
  { name: "Bursa Asia", source: "Gabungan Nikkei / KOSPI / TAIEX", lag: "hari sama", t: "6.41" },
  { name: "Futures Hang Seng", source: "Sesi semalam", lag: "kemarin", t: "3.18" },
  { name: "S&P 500", source: "Penutupan AS", lag: "kemarin", t: "4.77" },
  { name: "Kurs USD/IDR", source: "Spot 08:45 WIB", lag: "hari sama", t: "2.94" },
  { name: "Minyak Brent", source: "ICE bulan terdekat", lag: "hari sama", t: "2.05" },
  { name: "Batu bara Newcastle", source: "GlobalCOAL", lag: "kemarin", t: "1.72" },
  { name: "Arus dana asing IDX", source: "KSEI neto, rata-rata 5 hari", lag: "kemarin", t: "2.36" },
];

const OOS = [
  { label: "Ketepatan saat belajar (R²)", value: "0,31" },
  { label: "Ketepatan pada data baru (R²)", value: "0,27" },
  { label: "Rata-rata meleset", value: "0,52%" },
  { label: "Peringatan yang ternyata keliru", value: "18,4%" },
  { label: "Rata-rata peringatan per hari", value: "1,6 sektor" },
];

const BUCKETS = [
  { label: "0 – 0,5", v: 0.51 },
  { label: "0,5 – 1,0", v: 0.54 },
  { label: "1,0 – 1,5", v: 0.61 },
  { label: "1,5 – 2,0", v: 0.67 },
  { label: "2,0 ke atas", v: 0.74 },
];

const LIMITS = [
  {
    title: "Saat hubungan dengan pasar Asia putus",
    body: "Ketika keterkaitan turun di bawah 0,30 — biasanya saat ada guncangan dalam negeri — perkiraan model melemah dan hampir semua sektor tampak tidak biasa. Skornya melebar karena perkiraannya lemah, bukan karena pasarnya aneh.",
  },
  {
    title: "Satu perusahaan bisa mendominasi",
    body: "Beberapa sektor IDX dikuasai dua atau tiga perusahaan besar. Selisih di Kesehatan atau Teknologi sering hanya kabar satu perusahaan yang terlihat besar karena bobotnya. Halaman sektor ada untuk memisahkan keduanya — selalu cek dulu.",
  },
  {
    title: "Hanya jam pertama",
    body: "Model hanya melihat satu jam pertama perdagangan. Selisih pagi sering tidak bertahan sampai penutupan; grafik di atas menunjukkan seberapa sering arahnya bertahan, dan angkanya jauh dari pasti.",
  },
  {
    title: "Aksi korporasi",
    body: "Pembagian dividen, pemecahan saham, dan suspensi sudah dibersihkan. Tetapi perubahan susunan indeks diterapkan dengan jeda — satu sampai dua hari setelahnya, selisih bisa keliru.",
  },
  {
    title: "Bukan alat tebak harga",
    body: "Tidak ada target harga, jangka waktu, atau saran ukuran posisi. Selisih hanya penunjuk ke mana perhatian diarahkan pagi ini — tidak mengatakan apa pun soal ke mana harga akan bergerak.",
  },
];

export default function MethodologyView({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <>
      <Hero
        eyebrow="Cara kerja · versi 2.4"
        title={
          <>
            Membandingkan perkiraan
            <br />
            dengan kenyataan
          </>
        }
        tag="Setiap pagi, model belajar dari bursa Asia yang buka lebih dulu, lalu memperkirakan gerak tiap sektor IDX."
        aside={
          <MeterPanel
            title="Seberapa andal?"
            icon={<ShieldIcon />}
            sub={
              <>
                Selisih besar masih
                <br />
                searah saat tutup pada
                <br />
                74% kasus.
              </>
            }
            scale={["0%", "25%", "50%", "75%", "100%"]}
            fill={0.74}
            label="74 persen"
          />
        }
      />

      <div className="ds-statrow">
        <StatRow
          items={[
            { value: "120", label: <>Hari data<br />dipelajari</> },
            { value: "7", label: <>Faktor luar<br />yang dihitung</> },
            { value: "9.240", label: <>Pengamatan<br />diuji ulang</> },
          ]}
        />
        <Cta variant="glass" onClick={() => onNavigate("board")}>
          Kembali ke ringkasan
        </Cta>
      </div>

      <Glass delay={320} style={{ marginBottom: 20 }}>
        <SectionHead title="Intinya dalam tiga langkah" />
        <ol className="ds-steps">
          <li>
            <b>1</b>
            <strong>Perkiraan</strong>
            <p>
              Model melihat bursa Asia, Wall Street semalam, kurs rupiah, minyak, dan batu bara, lalu
              memperkirakan berapa persen tiap sektor IDX seharusnya bergerak di jam pertama.
            </p>
          </li>
          <li>
            <b>2</b>
            <strong>Selisih</strong>
            <p>
              Pukul 10:04 kami ambil gerak sebenarnya. Kenyataan dikurangi perkiraan = selisih. Selisih
              itulah yang tidak bisa dijelaskan oleh pasar luar negeri.
            </p>
          </li>
          <li>
            <b>3</b>
            <strong>Skor tidak biasa</strong>
            <p>
              Selisih dibandingkan dengan selisih normal sektor itu. Skor 0 = biasa saja, 2 ke atas = jarang
              terjadi (kira-kira 1 dari 20 hari).
            </p>
          </li>
        </ol>
      </Glass>

      <div className="ds-grid ds-split">
        <Glass delay={380}>
          <SectionHead
            title="Faktor yang dihitung model"
            note="Makin besar angka kekuatan, makin berpengaruh faktor itu pada perkiraan."
          />
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Faktor</th>
                  <th style={{ textAlign: "left" }}>Sumber</th>
                  <th style={{ textAlign: "right" }}>Data dari</th>
                  <th style={{ textAlign: "right" }}>
                    Kekuatan<small>rata-rata |t|</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONTROLS.map((c) => (
                  <tr key={c.name}>
                    <td style={{ fontWeight: 520, color: "var(--ink)" }}>{c.name}</td>
                    <td style={{ color: "var(--muted2)" }}>{c.source}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{c.lag}</td>
                    <td style={{ textAlign: "right", fontWeight: 520 }}>{c.t.replace(".", ",")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Glass>

        <Glass delay={420}>
          <SectionHead title="Rumus (untuk yang ingin tahu)" />
          <div
            className="tnum"
            style={{
              borderRadius: 18,
              background: "rgba(255,255,255,0.6)",
              boxShadow: "inset 0 0 0 1px rgba(120,145,180,0.2)",
              padding: "18px 18px",
              fontSize: 17,
              lineHeight: 1.9,
              color: "var(--ink)",
            }}
          >
            r<sub style={sub}>i,t</sub> = α<sub style={sub}>i</sub> + β<sub style={sub}>i</sub>·R
            <sub style={sub}>reg,t</sub> + γ<sub style={sub}>i</sub>·X<sub style={sub}>t</sub> + ε
            <sub style={sub}>i,t</sub>
            <div
              style={{
                borderTop: "1px solid rgba(120,145,180,0.2)",
                marginTop: 12,
                paddingTop: 10,
                fontSize: 14,
                color: "var(--muted2)",
                lineHeight: 1.8,
              }}
            >
              ε̂<sub>i,t</sub> = r<sub>i,t</sub> − r̂<sub>i,t</sub> &nbsp;·&nbsp; z<sub>i,t</sub> = ε̂
              <sub>i,t</sub> / σ(ε̂<sub>i,t−120:t−1</sub>)
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {SPEC.map((s) => (
              <div key={s.label} className="ds-kv">
                <span>{s.label}</span>
                <span>{s.value}</span>
              </div>
            ))}
          </div>
        </Glass>
      </div>

      <div className="ds-grid ds-split" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.35fr)" }}>
        <Glass delay={460}>
          <SectionHead
            title="Diuji pada data yang belum pernah dilihat"
            note="Model belajar dari 120 hari, lalu diuji pada 30 hari berikutnya, digeser terus sepanjang Jan 2023 – Ags 2026. Tidak ada pengaturan yang dipilih memakai data uji."
          />
          {OOS.map((o) => (
            <div key={o.label} className="ds-kv">
              <span>{o.label}</span>
              <span>{o.value}</span>
            </div>
          ))}
        </Glass>

        <Glass delay={500}>
          <SectionHead
            title="Seberapa sering arah selisih bertahan sampai tutup?"
            note="Dikelompokkan menurut skor tidak biasa. Makin tinggi skornya, makin sering arahnya bertahan · 9.240 pengamatan."
          />
          <div style={{ display: "grid", gap: 16 }}>
            {BUCKETS.map((b) => (
              <div
                key={b.label}
                style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr) 48px", alignItems: "center", gap: 14 }}
              >
                <span style={{ fontSize: 14, color: "var(--muted)" }}>Skor {b.label}</span>
                <Meter scale={[]} fill={b.v} label={`Skor ${b.label}: ${(b.v * 100).toFixed(0)} persen`} />
                <span className="tnum" style={{ fontSize: 15, fontWeight: 560, textAlign: "right" }}>
                  {(b.v * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </Glass>
      </div>

      <Glass delay={540}>
        <SectionHead title="Hal yang perlu diingat" note="Keterbatasan model — baca sebelum menarik kesimpulan." />
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

      <footer className="ds-footer">
        <span>Kartu model · revisi 04 Sep 2026</span>
        <span>Bukan nasihat investasi. Untuk riset internal.</span>
      </footer>
    </>
  );
}
