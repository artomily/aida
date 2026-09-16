"use client";

import { NEG, POS } from "../lib/model";
import { formatCompactIDR, formatIDR, type CompanyReport } from "../lib/companies";

const MUTED = "#8a847c";
const DIM = "#6f6960";
const RULE = "1px solid #24211d";
const SOFT = "1px solid #1a1815";

const label = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.14em",
  color: MUTED,
} as const;

const value = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "#ded9d1",
} as const;

function Figure({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: SOFT,
        padding: "7px 0",
      }}
    >
      <span style={{ ...label, letterSpacing: "0.08em" }}>{k}</span>
      <span style={{ ...value, color: color ?? "#ded9d1" }}>{v}</span>
    </div>
  );
}

/** Intraday path against the previous close — the only reference a trader reads it by. */
function Intraday({ report, up }: { report: CompanyReport; up: boolean }) {
  const pts = report.intraday;
  const W = 300;
  const H = 96;
  const lo = Math.min(...pts, report.prevClose);
  const hi = Math.max(...pts, report.prevClose);
  const pad = (hi - lo) * 0.12 || 1;
  const X = (i: number) => (i / (pts.length - 1)) * W;
  const Y = (v: number) => H - 6 - ((v - lo + pad) / (hi - lo + pad * 2)) * (H - 12);

  const line = pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p).toFixed(1)).join(" ");
  const color = up ? POS : NEG;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 96, display: "block" }}>
      <line
        x1="0"
        y1={Y(report.prevClose)}
        x2={W}
        y2={Y(report.prevClose)}
        stroke="#34302b"
        strokeWidth="1"
        strokeDasharray="2 4"
        vectorEffect="non-scaling-stroke"
      />
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={up ? "rgba(209,154,63,0.10)" : "rgba(176,86,74,0.10)"} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={X(pts.length - 1)}
        cy={Y(pts[pts.length - 1])}
        r="4"
        fill={color}
        stroke="#0c0b0a"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function CompanyReportPanel({ report }: { report: CompanyReport }) {
  const up = report.change >= 0;
  const col = up ? POS : NEG;
  const sign = up ? "+" : "−";
  const foreignBuy = report.foreignNet >= 0;

  return (
    <section style={{ borderTop: RULE, marginTop: 22, paddingTop: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "#e8e5e0",
          }}
        >
          {report.ticker}
        </h2>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#98918a" }}>
          {report.name}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ ...label, color: DIM }}>LAPORAN EMITEN · 10:04 WIB</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr)",
          gap: 28,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 34,
                fontWeight: 500,
                lineHeight: 1,
                color: "#f0ece5",
              }}
            >
              {formatIDR(report.last)}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: col, paddingBottom: 3 }}>
              {sign}
              {formatIDR(Math.abs(report.change))} ({sign}
              {Math.abs(report.changePct).toFixed(2).replace(".", ",")}%)
            </div>
          </div>
          <Figure k="PEMBUKAAN" v={formatIDR(report.open)} />
          <Figure k="TERTINGGI" v={formatIDR(report.high)} />
          <Figure k="TERENDAH" v={formatIDR(report.low)} />
          <Figure k="PENUTUPAN KEMARIN" v={formatIDR(report.prevClose)} />
          <Figure k="BOBOT INDEKS" v={report.indexWeight.toFixed(1).replace(".", ",") + "%"} />
        </div>

        <div>
          <div style={{ ...label, marginBottom: 12 }}>LIKUIDITAS &amp; VALUASI</div>
          <Figure k="VOLUME" v={formatIDR(report.volumeLot) + " lot"} />
          <Figure k="NILAI" v={formatCompactIDR(report.value)} />
          <Figure k="FREKUENSI" v={formatIDR(report.frequency) + "×"} />
          <Figure k="KAPITALISASI" v={formatCompactIDR(report.marketCap)} />
          <Figure k="PER" v={report.per.toFixed(1).replace(".", ",") + "×"} />
          <Figure k="PBV" v={report.pbv.toFixed(2).replace(".", ",") + "×"} />
          <Figure
            k="NET ASING"
            v={(foreignBuy ? "BELI " : "JUAL ") + formatCompactIDR(Math.abs(report.foreignNet))}
            color={foreignBuy ? POS : NEG}
          />
        </div>

        <div>
          <div style={{ ...label, marginBottom: 10 }}>INTRADAY · 09:00 → 10:04</div>
          <Intraday report={report} up={up} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: DIM,
              marginTop: 6,
            }}
          >
            <span>09:00</span>
            <span>— — — PENUTUPAN KEMARIN {formatIDR(report.prevClose)}</span>
            <span>10:04</span>
          </div>

          <div style={{ ...label, margin: "20px 0 10px 0" }}>CATATAN SESI</div>
          <div style={{ display: "grid", gap: 10 }}>
            {report.notes.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 12, borderBottom: SOFT, paddingBottom: 9 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: col, paddingTop: 2 }}>
                  {n.time}
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "#ded9d1" }}>
                    {n.text}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.12em",
                      color: DIM,
                      marginTop: 3,
                    }}
                  >
                    {n.source}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...label, color: DIM, marginTop: 16, letterSpacing: "0.1em" }}>
        DATA CONTOH · AKAN DIGANTI FEED EMITEN SAAT API TERSEDIA
      </div>
    </section>
  );
}
