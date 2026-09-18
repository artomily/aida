"use client";

import { NEG, POS } from "../lib/model";
import { formatCompactIDR, formatIDR, type CompanyReport } from "../lib/companies";
import { Arrow, Glass, SectionHead } from "./ui";

const comma = (v: number, d: number) => v.toFixed(d).replace(".", ",");

function Figure({ k, v, hint, color }: { k: string; v: string; hint?: string; color?: string }) {
  return (
    <div className="ds-kv" title={hint}>
      <span>{k}</span>
      <span style={color ? { color } : undefined}>{v}</span>
    </div>
  );
}

/** Intraday path against the previous close — the only reference a trader reads it by. */
function Intraday({ report, up }: { report: CompanyReport; up: boolean }) {
  const pts = report.intraday;
  const W = 300;
  const H = 110;
  const lo = Math.min(...pts, report.prevClose);
  const hi = Math.max(...pts, report.prevClose);
  const pad = (hi - lo) * 0.12 || 1;
  const X = (i: number) => (i / (pts.length - 1)) * W;
  const Y = (v: number) => H - 6 - ((v - lo + pad) / (hi - lo + pad * 2)) * (H - 12);

  const line = pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p).toFixed(1)).join(" ");
  const color = up ? POS : NEG;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: H, display: "block" }}
      role="img"
      aria-label={`Harga dari 09:00 sampai 10:04, terakhir ${formatIDR(report.last)}`}
    >
      <line
        x1="0"
        y1={Y(report.prevClose)}
        x2={W}
        y2={Y(report.prevClose)}
        stroke="#a7b4c6"
        strokeWidth="1"
        strokeDasharray="3 4"
        vectorEffect="non-scaling-stroke"
      />
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={up ? "rgba(58,106,168,0.12)" : "rgba(178,74,51,0.10)"} />
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
        stroke="#fff"
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
    <Glass delay={500} style={{ marginTop: 0 }}>
      <SectionHead
        title={
          <>
            {report.ticker} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {report.name}</span>
          </>
        }
        note="Laporan singkat perusahaan pukul 10:04 WIB."
      />

      <div className="ds-report">
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
            <div className="ds-num ds-num--sm">{formatIDR(report.last)}</div>
            <div className="tnum" style={{ fontSize: 16, fontWeight: 520, color: col, paddingBottom: 4 }}>
              <Arrow v={report.change} />
              {sign}
              {formatIDR(Math.abs(report.change))} ({sign}
              {comma(Math.abs(report.changePct), 2)}%)
            </div>
          </div>
          <Figure k="Harga pembukaan" v={formatIDR(report.open)} />
          <Figure k="Tertinggi hari ini" v={formatIDR(report.high)} />
          <Figure k="Terendah hari ini" v={formatIDR(report.low)} />
          <Figure k="Penutupan kemarin" v={formatIDR(report.prevClose)} />
          <Figure k="Porsi di indeks sektor" v={comma(report.indexWeight, 1) + "%"} />
        </div>

        <div>
          <h3 className="ds-h2" style={{ fontSize: 16, marginBottom: 6 }}>
            Ramai tidaknya & harga wajar
          </h3>
          <Figure k="Volume" v={formatIDR(report.volumeLot) + " lot"} hint="1 lot = 100 lembar saham" />
          <Figure k="Nilai transaksi" v={"Rp " + formatCompactIDR(report.value)} />
          <Figure k="Jumlah transaksi" v={formatIDR(report.frequency) + "×"} />
          <Figure k="Nilai perusahaan" v={"Rp " + formatCompactIDR(report.marketCap)} hint="Kapitalisasi pasar" />
          <Figure k="PER" v={comma(report.per, 1) + "×"} hint="Harga dibanding laba per saham" />
          <Figure k="PBV" v={comma(report.pbv, 2) + "×"} hint="Harga dibanding nilai buku" />
          <Figure
            k="Investor asing"
            v={(foreignBuy ? "Beli bersih Rp " : "Jual bersih Rp ") + formatCompactIDR(Math.abs(report.foreignNet))}
            color={foreignBuy ? POS : NEG}
          />
        </div>

        <div>
          <h3 className="ds-h2" style={{ fontSize: 16, marginBottom: 12 }}>
            Pergerakan harga 09:00 → 10:04
          </h3>
          <Intraday report={report} up={up} />
          <div
            className="tnum"
            style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#7c869d", marginTop: 8 }}
          >
            <span>09:00</span>
            <span>┄ penutupan kemarin {formatIDR(report.prevClose)}</span>
            <span>10:04</span>
          </div>

          <h3 className="ds-h2" style={{ fontSize: 16, margin: "22px 0 4px" }}>
            Catatan sesi
          </h3>
          {report.notes.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: "1px solid rgba(120,145,180,0.18)" }}>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 560, color: col, paddingTop: 1 }}>
                {n.time}
              </span>
              <div>
                <div style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink-soft)" }}>{n.text}</div>
                <div style={{ fontSize: 12, color: "#7c869d", marginTop: 3 }}>
                  {n.source.charAt(0) + n.source.slice(1).toLowerCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="ds-note" style={{ margin: "18px 0 0" }}>
        Data contoh — akan diganti data perusahaan asli saat feed tersedia.
      </p>
    </Glass>
  );
}
