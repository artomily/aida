"use client";

import { useMemo, useState } from "react";
import BoardCharts from "./BoardCharts";
import {
  DIVERGENT_THRESHOLD,
  NEG,
  POS,
  SECTORS,
  fmt,
  fmtZ,
  statusOf,
  STATUS_HINT,
  STATUS_LABEL,
  type Status,
  type View,
} from "../lib/model";
import { Arrow, Glass, GuidePill, Hero, MeterPanel, SectionHead, SplitBar, StatRow, StatusBadge, TargetIcon } from "./ui";

type SortKey = "name" | "e" | "a" | "r" | "z" | "s";

const COLUMNS: { key: SortKey; label: string; hint: string; align: "left" | "right" }[] = [
  { key: "name", label: "Sektor", hint: "11 sektor IDX", align: "left" },
  { key: "e", label: "Perkiraan", hint: "menurut model", align: "right" },
  { key: "a", label: "Kenyataan", hint: "pukul 10:04", align: "right" },
  { key: "r", label: "Selisih", hint: "kenyataan − perkiraan", align: "right" },
  { key: "z", label: "Seberapa tidak biasa", hint: "skor z, 0 = biasa", align: "right" },
  { key: "s", label: "Status", hint: "", align: "left" },
];

const STATUS_RANK: Record<Status, number> = { DIVERGENT: 2, WATCH: 1, NORMAL: 0 };

export default function BoardView({
  onOpenSector,
  onNavigate,
}: {
  onOpenSector: (slug: string) => void;
  onNavigate: (view: View) => void;
}) {
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
  const up = divergent.filter((d) => d.r >= 0).map((d) => d.name);
  const down = divergent.filter((d) => d.r < 0).map((d) => d.name);
  const n = divergent.length;

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setDir("desc");
    }
  };

  const tag =
    n === 0
      ? "Semua sektor bergerak kurang lebih seperti perkiraan."
      : [
          up.length ? `${up.join(" dan ")} lebih kuat` : "",
          down.length ? `${down.join(" dan ")} lebih lemah` : "",
        ]
          .filter(Boolean)
          .join(", ") + " dari perkiraan.";

  return (
    <>
      <Hero
        eyebrow={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Ringkasan pagi · Selasa, 15 Sep 2026
            <span className="ds-chip ds-pill" style={{ height: 30, padding: "0 12px", fontSize: 13 }}>
              <i />
              Diperbarui 10:04 WIB
            </span>
          </span>
        }
        title={
          n === 0 ? (
            <>
              Pasar bergerak
              <br />
              sesuai perkiraan
            </>
          ) : (
            <>
              {n} sektor bergerak
              <br />
              di luar perkiraan
            </>
          )
        }
        tag={tag}
        aside={
          <MeterPanel
            title="Ketepatan model"
            icon={<TargetIcon />}
            sub={
              <>
                Pasar Asia menjelaskan
                <br />
                sekitar 31% gerak IDX
                <br />
                di jam pertama.
              </>
            }
            scale={["0%", "25%", "50%", "75%", "100%"]}
            fill={0.31}
            label="Ketepatan model 31 persen"
          />
        }
      />

      <div className="ds-statrow">
        <StatRow
          items={[
            { value: n, label: <>Sektor di luar<br />perkiraan</> },
            { value: "0,48", label: <>Kaitan dengan<br />pasar Asia</> },
            { value: SECTORS.length, label: <>Sektor<br />dipantau</> },
          ]}
        />
        <GuidePill onClick={() => onNavigate("methodology")}>Cara membaca angka</GuidePill>
      </div>

      <div className="ds-grid ds-split">
        <Glass delay={350}>
          <SectionHead title="Apa yang terjadi pagi ini?" />
          <p className="ds-body">
            Bursa Asia yang buka lebih dulu cenderung positif tapi tipis — Nikkei naik 0,6% dan KOSPI
            0,4%. Dari situ model memperkirakan IDX dibuka sedikit menguat. Kenyataannya pukul 10:04,{" "}
            {n ? <strong style={{ fontWeight: 560 }}>{n} sektor</strong> : "tidak ada sektor yang"}{" "}
            bergerak jauh dari perkiraan. <strong style={{ fontWeight: 560 }}>Energi</strong> naik jauh
            lebih tinggi karena harga batu bara, sesuatu yang tidak terlihat dari bursa Asia.{" "}
            <strong style={{ fontWeight: 560 }}>Kesehatan</strong> turun, tetapi penurunannya hanya dari
            dua perusahaan besar — lebih mirip berita perusahaan daripada pergeseran seluruh sektor.
          </p>
        </Glass>
        <Glass delay={420}>
          <SectionHead title="Cara membaca papan ini" />
          <ol className="ds-steps" style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <li style={{ gridTemplateColumns: "34px 1fr", columnGap: 14 }}>
              <b>1</b>
              <div>
                <strong>Model membuat perkiraan</strong>
                <p>Berdasarkan bursa Asia yang sudah buka, berapa seharusnya tiap sektor naik atau turun.</p>
              </div>
            </li>
            <li style={{ gridTemplateColumns: "34px 1fr", columnGap: 14 }}>
              <b>2</b>
              <div>
                <strong>Kami bandingkan dengan kenyataan</strong>
                <p>Selisihnya menunjukkan ada hal lokal yang tidak dijelaskan pasar luar.</p>
              </div>
            </li>
            <li style={{ gridTemplateColumns: "34px 1fr", columnGap: 14 }}>
              <b>3</b>
              <div>
                <strong>Selisih besar = layak dicek</strong>
                <p>Bukan sinyal beli atau jual — hanya penunjuk ke mana perhatian diarahkan.</p>
              </div>
            </li>
          </ol>
        </Glass>
      </div>

      <BoardCharts />

      <Glass delay={560}>
        <SectionHead
          title="Semua sektor"
          note="Klik nama sektor untuk melihat perusahaan penggeraknya. Klik judul kolom untuk mengurutkan."
          right={
            <div className="ds-legend" style={{ paddingTop: 4 }}>
              <span>
                <i style={{ background: POS }} />▲ Lebih kuat dari perkiraan
              </span>
              <span>
                <i style={{ background: NEG }} />▼ Lebih lemah dari perkiraan
              </span>
            </div>
          }
        />

        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    style={{ textAlign: c.align }}
                    aria-sort={sortKey === c.key ? (dir === "desc" ? "descending" : "ascending") : undefined}
                  >
                    <button type="button" onClick={() => sortBy(c.key)}>
                      {c.label}
                      <span aria-hidden="true" style={{ fontSize: 10, opacity: sortKey === c.key ? 1 : 0.3 }}>
                        {sortKey === c.key && dir === "asc" ? "▲" : "▼"}
                      </span>
                    </button>
                    {c.hint && <small>{c.hint}</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const pos = d.r >= 0;
                const col = d.status === "NORMAL" ? undefined : pos ? POS : NEG;
                const bold = d.status === "DIVERGENT" ? 600 : 450;
                return (
                  <tr key={d.slug} className="is-click" onClick={() => onOpenSector(d.slug)}>
                    <td>
                      <button
                        type="button"
                        className="ds-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSector(d.slug);
                        }}
                      >
                        {d.name}
                      </button>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{fmt(d.e)}</td>
                    <td style={{ textAlign: "right" }}>{fmt(d.a)}</td>
                    <td style={{ textAlign: "right", color: col, fontWeight: bold }}>
                      <Arrow v={d.r} />
                      {fmt(d.r)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
                        <SplitBar ratio={d.z / 3} faded={d.status === "NORMAL"} />
                        <span style={{ width: 40, textAlign: "right", color: col, fontWeight: bold }}>
                          {fmtZ(d.z)}
                        </span>
                      </div>
                    </td>
                    <td title={STATUS_HINT[d.status]}>
                      <StatusBadge status={d.status} pos={pos} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="ds-legend" style={{ marginTop: 18 }}>
          {(["DIVERGENT", "WATCH", "NORMAL"] as Status[]).map((s) => (
            <span key={s}>
              <strong style={{ fontWeight: 560, color: "var(--ink)" }}>{STATUS_LABEL[s]}</strong>
              {s === "DIVERGENT"
                ? `skor ≥ ${DIVERGENT_THRESHOLD.toFixed(1).replace(".", ",")}`
                : s === "WATCH"
                  ? "skor 1,0 – 2,0"
                  : "skor di bawah 1,0"}
            </span>
          ))}
        </div>
      </Glass>

      <footer className="ds-footer">
        <span>Sumber: data sektor IDX dan indeks regional (penutupan hari sebelumnya).</span>
        <span>Bukan nasihat investasi. Untuk riset internal.</span>
      </footer>
    </>
  );
}
