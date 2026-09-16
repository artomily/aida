"use client";

import { useMemo, useState } from "react";
import BoardCharts from "./BoardCharts";
import {
  DIVERGENT_THRESHOLD,
  NEG,
  POS,
  SECTORS,
  badgeStyle,
  fmt,
  fmtZ,
  statusOf,
  STATUS_LABEL,
  type Status,
} from "../lib/model";

type SortKey = "name" | "e" | "a" | "r" | "z" | "s";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right"; w: string }[] = [
  { key: "name", label: "SEKTOR", align: "left", w: "auto" },
  { key: "e", label: "EKSPEKTASI", align: "right", w: "110px" },
  { key: "a", label: "REALISASI", align: "right", w: "110px" },
  { key: "r", label: "RESIDUAL", align: "right", w: "120px" },
  { key: "z", label: "Z-SCORE", align: "right", w: "210px" },
  { key: "s", label: "STATUS", align: "left", w: "130px" },
];

const STATUS_RANK: Record<Status, number> = { DIVERGENT: 2, WATCH: 1, NORMAL: 0 };
const CELL_BORDER = "1px solid #1a1815";

export default function BoardView({ onOpenSector }: { onOpenSector: (slug: string) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("z");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const enriched = SECTORS.map((d) => ({
      ...d,
      r: +(d.a - d.e).toFixed(2),
      status: statusOf(d.z),
    }));
    const s = dir === "desc" ? -1 : 1;
    return enriched.sort((x, y) => {
      if (sortKey === "name") return s * x.name.localeCompare(y.name);
      let a: number, b: number;
      if (sortKey === "s") {
        a = STATUS_RANK[x.status];
        b = STATUS_RANK[y.status];
      } else if (sortKey === "z") {
        a = Math.abs(x.z);
        b = Math.abs(y.z);
      } else {
        a = x[sortKey];
        b = y[sortKey];
      }
      return s * (a - b);
    });
  }, [sortKey, dir]);

  const divergent = rows.filter((d) => d.status === "DIVERGENT");
  const names = divergent.map((d) => d.name).join(" dan ");

  const metrics = [
    { label: "RATA-RATA KORELASI BERGULIR", value: "0,48", note: "60 HARI · vs −0,03 WoW" },
    { label: "R² MODEL", value: "0,31", note: "LUAR SAMPEL 0,27" },
    {
      label: "SEKTOR MENYIMPANG",
      value: String(divergent.length),
      note: "|z| ≥ " + DIVERGENT_THRESHOLD.toFixed(1),
    },
  ];

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setDir("desc");
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        width: "100%",
        padding: "0 28px",
      }}
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.1fr) minmax(0, 1fr)",
          borderBottom: "1px solid #24211d",
        }}
      >
        <div style={{ padding: "22px 28px 24px 0", borderRight: "1px solid #24211d" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "#8a847c",
              marginBottom: 12,
            }}
          >
            RINGKASAN PAGI · PRA-PEMBUKAAN
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 21,
              lineHeight: 1.55,
              color: "#ded9d1",
              textWrap: "pretty",
              textAlign: "justify",
              hyphens: "auto",
            }}
          >
            Sinyal regional pagi ini konstruktif tapi tipis — Nikkei +0,6%, KOSPI +0,4%, dan futures
            Hang Seng bergerak datar setelah data kredit Tiongkok. Model memperkirakan pembukaan IDX
            yang rata-rata melebar ke arah positif, dengan beban terbesar pada Teknologi dan Barang
            Baku. Realisasi pukul 10:04 memperlihatkan {divergent.length || "nol"} sektor
            menyimpang di luar ambang: {names || "tidak ada"}. Energi menyerap dorongan harga batu
            bara termal yang tidak tercermin di variabel kontrol regional, sementara pelemahan
            Kesehatan terkonsentrasi pada dua emiten berkapitalisasi besar — residual yang lebih
            layak dibaca sebagai peristiwa emiten, bukan rotasi sektor.
          </p>
        </div>
        <div
          style={{
            padding: "22px 0 24px 28px",
            display: "grid",
            gap: 16,
            alignContent: "start",
          }}
        >
          {metrics.map((m) => (
            <div key={m.label} style={{ display: "grid", gap: 5 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "#8a847c",
                }}
              >
                {m.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 24,
                    fontWeight: 500,
                    color: "#e8e5e0",
                    lineHeight: 1,
                  }}
                >
                  {m.value}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7d776f" }}>
                  {m.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BoardCharts />

      <section style={{ padding: "22px 0 0 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
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
            PAPAN DIVERGENSI
          </h2>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#7d776f" }}>
            11 SEKTOR IDX · KLIK JUDUL KOLOM UNTUK MENGURUTKAN
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#7d776f",
            }}
          >
            <span>
              <span style={{ color: POS }}>■</span> RESIDUAL POSITIF
            </span>
            <span>
              <span style={{ color: NEG }}>■</span> RESIDUAL NEGATIF
            </span>
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
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="dv-th"
                    onClick={() => sortBy(c.key)}
                    style={{
                      padding: "9px 12px",
                      paddingLeft: c.key === "s" ? 20 : 12,
                      textAlign: c.align,
                      width: c.w,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.13em",
                      color: sortKey === c.key ? POS : "#8a847c",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    {c.label + (sortKey === c.key ? (dir === "desc" ? "  ▼" : "  ▲") : "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const pos = d.r >= 0;
                const col = d.status === "NORMAL" ? "#ded9d1" : pos ? POS : NEG;
                const half = Math.min(Math.abs(d.z) / 3, 1) * 50;
                const bold = d.status === "DIVERGENT" ? 600 : 400;
                return (
                  <tr
                    key={d.slug}
                    className="dv-row"
                    style={{
                      borderLeft: `2px solid ${
                        d.status === "DIVERGENT" ? (pos ? POS : NEG) : "transparent"
                      }`,
                      background: "transparent",
                      transition: "background 120ms ease",
                    }}
                  >
                    <td
                      style={{
                        padding: "0 12px",
                        height: 38,
                        verticalAlign: "middle",
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onOpenSector(d.slug);
                        }}
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "#ded9d1",
                        }}
                      >
                        {d.name}
                      </a>
                    </td>
                    <td
                      style={{
                        padding: "0 12px",
                        textAlign: "right",
                        color: "#8a847c",
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      {fmt(d.e)}
                    </td>
                    <td
                      style={{
                        padding: "0 12px",
                        textAlign: "right",
                        color: "#ded9d1",
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      {fmt(d.a)}
                    </td>
                    <td
                      style={{
                        padding: "0 12px",
                        textAlign: "right",
                        verticalAlign: "middle",
                        color: col,
                        fontWeight: bold,
                        borderBottom: CELL_BORDER,
                      }}
                    >
                      {fmt(d.r)}
                    </td>
                    <td style={{ padding: "0 12px", borderBottom: CELL_BORDER }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          justifyContent: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: 132,
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
                              left: pos ? "50%" : `${50 - half}%`,
                              width: `${half}%`,
                              background: pos ? POS : NEG,
                              opacity: d.status === "NORMAL" ? 0.42 : 0.92,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            width: 48,
                            textAlign: "right",
                            color: col,
                            fontWeight: bold,
                          }}
                        >
                          {fmtZ(d.z)}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0 12px 0 20px", borderBottom: CELL_BORDER }}>
                      <span style={badgeStyle(d.status, pos)}>{STATUS_LABEL[d.status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer
        style={{
          marginTop: 28,
          borderTop: "1px solid #24211d",
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
        <span>SUMBER · API SEKTOR IDX, FEED INDEKS REGIONAL (PENUTUPAN T−1)</span>
        <span>MODEL · OLS, JENDELA BERGULIR 120 HARI</span>
        <div style={{ flex: 1 }} />
        <span>BUKAN NASIHAT INVESTASI. UNTUK RISET INTERNAL.</span>
      </footer>
    </div>
  );
}
