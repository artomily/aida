"use client";

import {
  NEG,
  POS,
  SECTORS,
  badgeStyle,
  chartX,
  chartY,
  contributorsOf,
  correlationSeries,
  fmt,
  fmtPP,
  fmtZ,
  statusOf,
} from "../lib/model";

const CELL_BORDER = "1px solid #1a1815";
const HEAD_CELL = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.13em",
  color: "#8a847c",
} as const;

export default function DetailView({
  slug,
  onBack,
}: {
  slug: string | null;
  onBack: () => void;
}) {
  const sector = SECTORS.find((s) => s.slug === slug) ?? SECTORS[1];
  const r = +(sector.a - sector.e).toFixed(2);
  const status = statusOf(sector.z);
  const pos = r >= 0;
  const col = status === "NORMAL" ? "#ded9d1" : pos ? POS : NEG;

  const contributors = contributorsOf(sector);
  const maxContrib = Math.max(...contributors.map((c) => Math.abs(c.contribV)), 1);

  const pts = correlationSeries(sector.slug);
  const linePath = pts
    .map((p, i) => (i ? "L" : "M") + chartX(i).toFixed(1) + " " + chartY(p).toFixed(1))
    .join(" ");
  const areaPath = linePath + " L300 140 L0 140 Z";
  const last = pts[pts.length - 1];

  const figures = [
    { label: "EXPECTED", value: fmt(sector.e), note: "MODEL FIT 10:00", color: "#8a847c", bold: 400 },
    { label: "ACTUAL", value: fmt(sector.a), note: "INDEX 10:04 WIB", color: "#ded9d1", bold: 400 },
    { label: "RESIDUAL", value: fmt(r), note: "ACTUAL − EXPECTED", color: col, bold: 600 },
  ];

  const stats = [
    { label: "CURRENT ρ", value: last.toFixed(2) },
    { label: "60D MEAN", value: (pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(2) },
    {
      label: "60D RANGE",
      value: Math.min(...pts).toFixed(2) + " – " + Math.max(...pts).toFixed(2),
    },
    {
      label: "RESIDUAL σ (120D)",
      value: (Math.abs(r / (sector.z || 1)) || 0.5).toFixed(2) + "%",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        width: "100%",
        padding: "0 28px 40px 28px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "16px 0",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "#7d776f",
        }}
      >
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          style={{ color: "#8a847c" }}
        >
          BOARD
        </a>
        <span>/</span>
        <span style={{ color: "#ded9d1" }}>{sector.name.toUpperCase()}</span>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.5fr)",
          borderTop: "1px solid #24211d",
          borderBottom: "1px solid #24211d",
        }}
      >
        <div style={{ padding: "26px 28px 28px 0", borderRight: "1px solid #24211d" }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontFamily: "var(--font-serif)",
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1.1,
              color: "#f0ece5",
            }}
          >
            {sector.name}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "#7d776f",
              marginBottom: 18,
            }}
          >
            IDX SECTOR INDEX · {sector.code}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 68,
                fontWeight: 500,
                lineHeight: 0.85,
                color: col,
                letterSpacing: "-0.02em",
              }}
            >
              {fmtZ(sector.z)}
            </div>
            <div style={{ display: "grid", gap: 4, paddingBottom: 8 }}>
              <span style={badgeStyle(status, pos)}>{status}</span>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#7d776f",
                  whiteSpace: "nowrap",
                }}
              >
                Z-SCORE · 120D RESIDUAL σ
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            alignContent: "center",
          }}
        >
          {figures.map((f) => (
            <div key={f.label} style={{ padding: "26px 20px 28px 28px" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "#8a847c",
                  marginBottom: 8,
                }}
              >
                {f.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 26,
                  color: f.color,
                  fontWeight: f.bold,
                }}
              >
                {f.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6f6960",
                  marginTop: 6,
                }}
              >
                {f.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 2.05fr) minmax(0, 1fr)" }}>
        <div style={{ padding: "22px 28px 0 0", borderRight: "1px solid #24211d" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 12 }}>
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
              CONTRIBUTORS
            </h2>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#7d776f" }}>
              TOP 8 BY INDEX WEIGHT · CONTRIBUTION IN pp OF RESIDUAL
            </div>
          </div>
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
                <tr style={{ borderTop: "1px solid #24211d", borderBottom: "1px solid #24211d" }}>
                  <th style={{ ...HEAD_CELL, padding: "9px 12px 9px 0", textAlign: "left", width: 78 }}>
                    TICKER
                  </th>
                  <th style={{ ...HEAD_CELL, padding: "9px 12px", textAlign: "left" }}>NAME</th>
                  <th style={{ ...HEAD_CELL, padding: "9px 12px", textAlign: "right", width: 92 }}>
                    RETURN
                  </th>
                  <th style={{ ...HEAD_CELL, padding: "9px 12px", textAlign: "right", width: 84 }}>
                    WEIGHT
                  </th>
                  <th style={{ ...HEAD_CELL, padding: "9px 0 9px 12px", textAlign: "left", width: 210 }}>
                    CONTRIB.
                  </th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((c) => {
                  const cp = c.contribV >= 0;
                  const half = (Math.abs(c.contribV) / maxContrib) * 50;
                  return (
                    <tr key={c.ticker} className="dv-row">
                      <td
                        style={{
                          padding: "0 12px 0 0",
                          height: 34,
                          verticalAlign: "middle",
                          color: "#ded9d1",
                          borderBottom: CELL_BORDER,
                        }}
                      >
                        {c.ticker}
                      </td>
                      <td
                        style={{
                          padding: "0 12px",
                          fontFamily: "var(--font-sans)",
                          color: "#98918a",
                          borderBottom: CELL_BORDER,
                        }}
                      >
                        {c.company}
                      </td>
                      <td
                        style={{
                          padding: "0 12px",
                          textAlign: "right",
                          verticalAlign: "middle",
                          color: c.retV >= 0 ? "#ded9d1" : "#c08a82",
                          borderBottom: CELL_BORDER,
                        }}
                      >
                        {fmt(c.retV)}
                      </td>
                      <td
                        style={{
                          padding: "0 12px",
                          textAlign: "right",
                          color: "#8a847c",
                          borderBottom: CELL_BORDER,
                        }}
                      >
                        {c.weightV.toFixed(1)}%
                      </td>
                      <td style={{ padding: "0 0 0 12px", borderBottom: CELL_BORDER }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              position: "relative",
                              width: 128,
                              height: 7,
                              background: "#151310",
                              border: "1px solid #221f1c",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: -3,
                                bottom: -3,
                                left: "50%",
                                width: 1,
                                background: "#34302b",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: cp ? "50%" : `${50 - half}%`,
                                width: `${half}%`,
                                background: cp ? POS : NEG,
                                opacity: 0.85,
                              }}
                            />
                          </div>
                          <div style={{ width: 52, textAlign: "right", color: cp ? POS : NEG }}>
                            {fmtPP(c.contribV)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ padding: "22px 0 0 28px" }}>
          <h2
            style={{
              margin: "0 0 4px 0",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "#e8e5e0",
            }}
          >
            ROLLING CORRELATION
          </h2>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#7d776f",
              marginBottom: 16,
            }}
          >
            60-DAY vs REGIONAL COMPOSITE
          </div>
          <svg
            viewBox="0 0 300 140"
            preserveAspectRatio="none"
            style={{ width: "100%", height: 140, display: "block" }}
          >
            <line x1="0" y1="14" x2="300" y2="14" stroke="#1e1b18" strokeWidth="1" />
            <line
              x1="0"
              y1="70"
              x2="300"
              y2="70"
              stroke="#2a2622"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <line x1="0" y1="126" x2="300" y2="126" stroke="#1e1b18" strokeWidth="1" />
            <path d={areaPath} fill="rgba(209,154,63,0.10)" stroke="none" />
            <path d={linePath} fill="none" stroke={POS} strokeWidth="1.4" />
            <circle cx={chartX(59).toFixed(1)} cy={chartY(last).toFixed(1)} r="2.6" fill={POS} />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6f6960",
              marginTop: 8,
            }}
          >
            <span>T−60</span>
            <span>0.80</span>
            <span>T</span>
          </div>
          <div
            style={{
              borderTop: "1px solid #24211d",
              marginTop: 18,
              paddingTop: 14,
              display: "grid",
              gap: 10,
            }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#8a847c", letterSpacing: "0.08em" }}>{s.label}</span>
                <span style={{ color: "#ded9d1" }}>{s.value}</span>
              </div>
            ))}
          </div>
          <p
            style={{
              margin: "18px 0 0 0",
              fontFamily: "var(--font-serif)",
              fontSize: 17,
              lineHeight: 1.5,
              color: "#b8b2a9",
              textAlign: "justify",
              hyphens: "auto",
            }}
          >
            Korelasi sektor ini terhadap komposit regional melemah sejak pertengahan Agustus,
            sehingga residual sebesar ini punya bobot lebih besar: semakin rendah ρ, semakin longgar
            ekspektasi model dan semakin layak residual dibaca sebagai faktor domestik.
          </p>
        </div>
      </section>
    </div>
  );
}
