import { POS } from "../lib/model";

const CELL_BORDER = "1px solid #1a1815";
const RULE = "1px solid #24211d";

const HEAD_CELL = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.13em",
  color: "#8a847c",
} as const;

const SECTION_TITLE = {
  margin: "0 0 14px 0",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.16em",
  color: "#e8e5e0",
} as const;

const SPEC = [
  { label: "ESTIMATOR", value: "OLS, HAC (Newey–West, 5 lag)" },
  { label: "ESTIMATION WINDOW", value: "120 hari bursa, bergulir" },
  { label: "TARGET", value: "Return sektor 09:00–10:00 WIB" },
  { label: "REFIT", value: "Harian, 06:30 WIB" },
  { label: "UNIVERSE", value: "11 indeks sektor IDX-IC" },
];

const CONTROLS = [
  { name: "R_reg", source: "Composite Nikkei / KOSPI / TAIEX", lag: "same-day", t: "6.41" },
  { name: "HSI futures", source: "Overnight session", lag: "t−1", t: "3.18" },
  { name: "S&P 500", source: "US close", lag: "t−1", t: "4.77" },
  { name: "USD/IDR", source: "Spot 08:45 WIB", lag: "same-day", t: "2.94" },
  { name: "Brent", source: "ICE front month", lag: "same-day", t: "2.05" },
  { name: "Newcastle coal", source: "GlobalCOAL", lag: "t−1", t: "1.72" },
  { name: "IDX foreign flow", source: "KSEI net, 5d MA", lag: "t−1", t: "2.36" },
];

const OOS = [
  { label: "R² IN-SAMPLE", value: "0.31" },
  { label: "R² OUT-OF-SAMPLE", value: "0.27" },
  { label: "RMSE RESIDUAL", value: "0.52%" },
  { label: "FALSE-POSITIVE RATE (|z| ≥ 2)", value: "18,4%" },
  { label: "ALERT FREQUENCY", value: "1,6 sektor/hari" },
];

const BUCKETS = [
  { label: "|z| 0–0,5", v: 0.51 },
  { label: "|z| 0,5–1,0", v: 0.54 },
  { label: "|z| 1,0–1,5", v: 0.61 },
  { label: "|z| 1,5–2,0", v: 0.67 },
  { label: "|z| ≥ 2,0", v: 0.74 },
];

const LIMITS = [
  {
    num: "01",
    title: "KORELASI YANG RUNTUH",
    body: "Ketika korelasi bergulir turun di bawah 0,30 — biasanya saat guncangan domestik — model kehilangan daya prediksi dan hampir semua sektor tampak divergent. Pada kondisi itu z-score melebar karena ekspektasinya lemah, bukan karena pasarnya menyimpang.",
  },
  {
    num: "02",
    title: "KONSENTRASI EMITEN",
    body: "Beberapa indeks sektor IDX didominasi dua atau tiga emiten. Residual Healthcare atau Technology sering merupakan peristiwa satu emiten yang diperbesar oleh bobot kapitalisasi, bukan rotasi sektor. Halaman kontributor ada untuk memisahkan keduanya — selalu periksa sebelum menafsirkan.",
  },
  {
    num: "03",
    title: "JENDELA SATU JAM",
    body: "Target hanya mencakup jam pertama perdagangan. Residual pagi tidak bertahan sampai penutupan pada mayoritas kasus; hit rate di atas menunjukkan berapa sering arahnya tetap, dan angkanya jauh dari pasti.",
  },
  {
    num: "04",
    title: "AKSI KORPORASI",
    body: "Ex-dividend, stock split, dan suspensi dibersihkan dari seri return, tetapi rebalancing indeks dan perubahan free float diterapkan dengan jeda — satu hingga dua hari setelah efektif residual bisa keliru.",
  },
  {
    num: "05",
    title: "BUKAN MODEL HARGA",
    body: "Tidak ada komponen expected return, tidak ada horizon, tidak ada ukuran posisi. Residual adalah alat penyaring perhatian: ia menunjukkan ke mana harus menoleh pagi ini, dan tidak menyatakan apa pun soal ke mana harga akan bergerak.",
  },
];

const sub = { color: "#8a847c" };

export default function MethodologyView() {
  return (
    <div style={{ width: "100%", padding: "0 28px 48px 28px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2.1fr)",
          borderBottom: RULE,
        }}
      >
        <div style={{ padding: "30px 28px 32px 0", borderRight: RULE }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "#7d776f",
              marginBottom: 12,
            }}
          >
            METHODOLOGY · v2.4
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1.12,
              color: "#f0ece5",
            }}
          >
            Estimasi ekspektasi sektor dari sinyal pasar regional
          </h1>
        </div>
        <div style={{ padding: "30px 0 32px 28px" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              lineHeight: 1.55,
              color: "#ded9d1",
              textAlign: "justify",
              hyphens: "auto",
            }}
          >
            Setiap pagi, sebelum sesi pertama IDX dibuka, model meregresikan return pembukaan tiap
            sektor terhadap pergerakan indeks regional yang sudah lebih dulu berdagang. Selisih
            antara return realisasi dan return yang diperkirakan model — residual — adalah unit
            analisis produk ini. Residual besar bukan sinyal beli atau jual; ia penanda bahwa
            sesuatu yang bersifat domestik sedang berjalan dan belum tercermin di sinyal regional.
          </p>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2.1fr)",
          borderBottom: RULE,
        }}
      >
        <div style={{ padding: "26px 28px 30px 0", borderRight: RULE }}>
          <h2 style={SECTION_TITLE}>SPECIFICATION</h2>
          <div
            style={{
              border: RULE,
              padding: "18px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.9,
              color: "#ded9d1",
            }}
          >
            r<sub style={sub}>i,t</sub> = α<sub style={sub}>i</sub> + β<sub style={sub}>i</sub>·R
            <sub style={sub}>reg,t</sub> + γ<sub style={sub}>i</sub>·X<sub style={sub}>t</sub> + ε
            <sub style={sub}>i,t</sub>
            <div
              style={{
                borderTop: RULE,
                marginTop: 14,
                paddingTop: 12,
                fontSize: 11,
                color: "#8a847c",
                lineHeight: 1.8,
              }}
            >
              ε̂<sub>i,t</sub> = r<sub>i,t</sub> − r̂<sub>i,t</sub> &nbsp;·&nbsp; z<sub>i,t</sub> = ε̂
              <sub>i,t</sub> / σ(ε̂<sub>i,t−120:t−1</sub>)
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 9,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
          >
            {SPEC.map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <span style={{ color: "#8a847c", letterSpacing: "0.06em" }}>{s.label}</span>
                <span style={{ color: "#ded9d1", textAlign: "right" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "26px 0 30px 28px" }}>
          <h2 style={SECTION_TITLE}>CONTROL VARIABLES</h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-mono)",
                fontSize: "12.5px",
              }}
            >
              <thead>
                <tr style={{ borderTop: RULE, borderBottom: RULE }}>
                  <th style={{ ...HEAD_CELL, padding: "9px 12px 9px 0", textAlign: "left" }}>
                    VARIABLE
                  </th>
                  <th style={{ ...HEAD_CELL, padding: "9px 12px", textAlign: "left" }}>SOURCE</th>
                  <th style={{ ...HEAD_CELL, padding: "9px 12px", textAlign: "right", width: 96 }}>
                    LAG
                  </th>
                  <th style={{ ...HEAD_CELL, padding: "9px 0 9px 12px", textAlign: "right", width: 120 }}>
                    MEAN |t|
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONTROLS.map((c) => (
                  <tr key={c.name} className="dv-row">
                    <td
                      style={{
                        padding: "0 12px 0 0",
                        height: 34,
                        verticalAlign: "middle",
                        color: "#ded9d1",
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      {c.name}
                    </td>
                    <td
                      style={{
                        padding: "0 12px",
                        fontFamily: "var(--font-sans)",
                        color: "#98918a",
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      {c.source}
                    </td>
                    <td
                      style={{
                        padding: "0 12px",
                        textAlign: "right",
                        color: "#8a847c",
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      {c.lag}
                    </td>
                    <td
                      style={{
                        padding: "0 0 0 12px",
                        textAlign: "right",
                        color: "#ded9d1",
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      {c.t}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2.1fr)",
          borderBottom: RULE,
        }}
      >
        <div style={{ padding: "26px 28px 30px 0", borderRight: RULE }}>
          <h2 style={SECTION_TITLE}>OUT-OF-SAMPLE</h2>
          <p
            style={{
              margin: "0 0 18px 0",
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              lineHeight: 1.55,
              color: "#b8b2a9",
              textAlign: "justify",
              hyphens: "auto",
            }}
          >
            Estimasi dilakukan pada jendela bergulir 120 hari dan diuji pada 30 hari berikutnya,
            digulirkan ke depan sepanjang Jan 2023 – Ags 2026. Tidak ada parameter yang dipilih
            menggunakan data uji.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {OOS.map((o) => (
              <div
                key={o.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: CELL_BORDER,
                  paddingBottom: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: "11.5px",
                }}
              >
                <span style={{ color: "#8a847c", letterSpacing: "0.06em" }}>{o.label}</span>
                <span style={{ color: "#ded9d1" }}>{o.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "26px 0 30px 28px" }}>
          <h2 style={{ ...SECTION_TITLE, margin: "0 0 4px 0" }}>HIT RATE PER |Z| BUCKET</h2>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#7d776f",
              marginBottom: 18,
            }}
          >
            PROPORSI RESIDUAL YANG MASIH SEARAH PADA PENUTUPAN HARI YANG SAMA · n = 9.240 OBSERVASI
            SEKTOR-HARI
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {BUCKETS.map((b) => (
              <div
                key={b.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "108px minmax(0, 1fr) 96px",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "#8a847c" }}>
                  {b.label}
                </div>
                <div style={{ height: 9, background: "#151310", border: "1px solid #221f1c" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(b.v * 100).toFixed(0)}%`,
                      background: POS,
                      opacity: 0.45 + b.v * 0.5,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11.5px",
                    color: "#ded9d1",
                    textAlign: "right",
                  }}
                >
                  {(b.v * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2.1fr)" }}>
        <div style={{ padding: "26px 28px 30px 0", borderRight: RULE }}>
          <h2 style={{ ...SECTION_TITLE, margin: 0, color: POS }}>LIMITATIONS</h2>
        </div>
        <div style={{ padding: "26px 0 30px 28px", display: "grid", gap: 22 }}>
          {LIMITS.map((l) => (
            <div
              key={l.num}
              style={{
                display: "grid",
                gridTemplateColumns: "26px minmax(0, 1fr)",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: POS,
                  paddingTop: 6,
                }}
              >
                {l.num}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "#ded9d1",
                    marginBottom: 7,
                  }}
                >
                  {l.title}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    lineHeight: 1.55,
                    color: "#b8b2a9",
                    textAlign: "justify",
                    hyphens: "auto",
                  }}
                >
                  {l.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          borderTop: RULE,
          padding: "16px 0 26px 0",
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "#6f6960",
        }}
      >
        <span>MODEL CARD · REVISI 04 SEP 2026</span>
        <div style={{ flex: 1 }} />
        <span>BUKAN NASIHAT INVESTASI. UNTUK RISET INTERNAL.</span>
      </footer>
    </div>
  );
}
