"use client";

import { useState } from "react";
import CompanyReportPanel from "./CompanyReportPanel";
import SectorNews from "./markets/SectorNews";
import type { SectorSlug } from "../lib/markets/types";
import { getCompanyReport } from "../lib/companies";
import {
  DIVERGENT_THRESHOLD,
  NEG,
  POS,
  SECTORS,
  chartX,
  chartY,
  contributorsOf,
  correlationSeries,
  fmt,
  fmtPP,
  fmtZ,
  statusOf,
  STATUS_HINT,
} from "../lib/model";
import { Arrow, Cta, Glass, Hero, MeterPanel, SectionHead, SplitBar, StatRow, StatusBadge, TargetIcon } from "./ui";

/** With no sector picked, open the one furthest from the model — that is why anyone came here. */
const MOST_UNUSUAL = [...SECTORS].sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];

const move = (v: number) => (v > 0 ? "naik" : v < 0 ? "turun" : "datar");

export default function DetailView({
  slug,
  onBack,
  onOpenSector,
}: {
  slug: string | null;
  onBack: () => void;
  onOpenSector: (slug: string) => void;
}) {
  const sector = SECTORS.find((s) => s.slug === slug) ?? MOST_UNUSUAL;
  const r = +(sector.a - sector.e).toFixed(2);
  const status = statusOf(sector.z);
  const pos = r >= 0;
  const col = status === "NORMAL" ? undefined : pos ? POS : NEG;

  const contributors = contributorsOf(sector);
  const maxContrib = Math.max(...contributors.map((c) => Math.abs(c.contribV)), 1);

  // Largest contributor opens by default — it is the one carrying the residual.
  const [picked, setPicked] = useState<string | null>(null);
  const active = contributors.find((c) => c.ticker === picked) ?? contributors[0] ?? null;
  const activeTicker = active?.ticker ?? null;
  const report = active ? getCompanyReport(sector.slug, active.ticker, active.retV) : null;

  const pts = correlationSeries(sector.slug);
  const linePath = pts
    .map((p, i) => (i ? "L" : "M") + chartX(i).toFixed(1) + " " + chartY(p).toFixed(1))
    .join(" ");
  const areaPath = linePath + " L300 140 L0 140 Z";
  const last = pts[pts.length - 1];
  const mean = pts.reduce((a, b) => a + b, 0) / pts.length;

  const stats = [
    { label: "Keterkaitan hari ini", value: last.toFixed(2) },
    { label: "Rata-rata 60 hari", value: mean.toFixed(2) },
    { label: "Rentang 60 hari", value: Math.min(...pts).toFixed(2) + " – " + Math.max(...pts).toFixed(2) },
    { label: "Gerak harian normal", value: "± " + (Math.abs(r / (sector.z || 1)) || 0.5).toFixed(2) + "%" },
  ];

  const others = SECTORS.filter((s) => s.slug !== sector.slug).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 28 }}>
        <Cta variant="back" onClick={onBack}>
          Semua sektor
        </Cta>
        <label className="ds-chip ds-pill" style={{ paddingRight: 8 }}>
          <span>Pindah sektor</span>
          <select
            value={sector.slug}
            onChange={(e) => onOpenSector(e.target.value)}
            style={{
              font: "inherit",
              fontWeight: 520,
              color: "var(--ink)",
              background: "transparent",
              border: 0,
              padding: "6px 4px",
              cursor: "pointer",
            }}
          >
            {[sector, ...others].map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Hero
        eyebrow={`Sektor · kode indeks ${sector.code}`}
        title={sector.name}
        tag={
          <>
            Model memperkirakan sektor ini {move(sector.e)} {fmt(Math.abs(sector.e)).replace(/^[+−]/, "")}, kenyataannya{" "}
            {move(sector.a)} {fmt(Math.abs(sector.a)).replace(/^[+−]/, "")}.
          </>
        }
        aside={
          <MeterPanel
            title="Seberapa tidak biasa"
            dot={col ?? "var(--slash)"}
            icon={<TargetIcon />}
            big={<span style={{ color: col }}>{fmtZ(sector.z)}</span>}
            sub={
              <>
                <StatusBadge status={status} pos={pos} />
                <span style={{ display: "block", marginTop: 10, fontSize: 14.5, lineHeight: 1.4 }}>
                  {STATUS_HINT[status]}
                </span>
              </>
            }
            scale={["0", "1", "2", "3+"]}
            fill={Math.abs(sector.z) / 3}
            label={`Skor tidak biasa ${fmtZ(sector.z)} dari 3`}
          />
        }
      />

      <div className="ds-statrow">
        <StatRow
          small
          items={[
            { value: fmt(sector.e), label: <>Perkiraan<br />model</> },
            { value: fmt(sector.a), label: <>Kenyataan<br />pukul 10:04</> },
            {
              value: (
                <>
                  <Arrow v={r} />
                  {fmt(r)}
                </>
              ),
              label: <>Selisih dari<br />perkiraan</>,
              color: col,
            },
          ]}
        />
      </div>

      <div className="ds-grid ds-split">
        <Glass delay={350}>
          <SectionHead
            title="Siapa penggeraknya?"
            note="8 perusahaan terbesar di sektor ini. Kolom kontribusi menunjukkan seberapa besar tiap perusahaan mendorong selisih. Klik baris untuk laporan perusahaan."
          />
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Kode</th>
                  <th style={{ textAlign: "left" }}>Perusahaan</th>
                  <th style={{ textAlign: "right" }}>
                    Return<small>hari ini</small>
                  </th>
                  <th style={{ textAlign: "right" }}>
                    Bobot<small>di indeks</small>
                  </th>
                  <th style={{ textAlign: "right" }}>
                    Kontribusi<small>ke selisih, poin %</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((c) => {
                  const cp = c.contribV >= 0;
                  const isActive = c.ticker === activeTicker;
                  return (
                    <tr
                      key={c.ticker}
                      className="is-click"
                      data-active={isActive || undefined}
                      tabIndex={0}
                      aria-selected={isActive}
                      onClick={() => setPicked(c.ticker)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPicked(c.ticker);
                        }
                      }}
                    >
                      <td style={{ fontWeight: 560, color: "var(--ink)" }}>{c.ticker}</td>
                      <td style={{ color: "var(--muted2)" }}>{c.company}</td>
                      <td style={{ textAlign: "right", color: c.retV < 0 ? NEG : undefined }}>
                        {fmt(c.retV)}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>
                        {c.weightV.toFixed(1)}%
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
                          <SplitBar ratio={c.contribV / maxContrib} />
                          <span style={{ width: 52, textAlign: "right", color: cp ? POS : NEG, fontWeight: 520 }}>
                            {fmtPP(c.contribV)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Glass>

        <Glass delay={420}>
          <SectionHead
            title="Seberapa ikut pasar Asia?"
            note="Keterkaitan sektor ini dengan bursa Asia selama 60 hari (0 = tidak terkait, 1 = bergerak persis sama)."
          />
          <svg
            viewBox="0 0 300 140"
            preserveAspectRatio="none"
            style={{ width: "100%", height: 140, display: "block" }}
            role="img"
            aria-label={`Keterkaitan 60 hari, terakhir ${last.toFixed(2)}`}
          >
            <line x1="0" y1="14" x2="300" y2="14" stroke="rgb(var(--line) / 0.18)" strokeWidth="1" />
            <line x1="0" y1="70" x2="300" y2="70" stroke="var(--slash)" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="0" y1="126" x2="300" y2="126" stroke="rgb(var(--line) / 0.18)" strokeWidth="1" />
            <path d={areaPath} fill="var(--area-pos)" stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke={POS}
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={chartX(59).toFixed(1)}
              cy={chartY(last).toFixed(1)}
              r="4"
              fill={POS}
              stroke="var(--surface)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            className="tnum"
            style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--dim)", marginTop: 8 }}
          >
            <span>60 hari lalu</span>
            <span>Hari ini</span>
          </div>
          <div style={{ marginTop: 14 }}>
            {stats.map((s) => (
              <div key={s.label} className="ds-kv">
                <span>{s.label}</span>
                <span>{s.value}</span>
              </div>
            ))}
          </div>
          <p className="ds-note" style={{ margin: "16px 0 0", fontSize: 14.5 }}>
            Keterkaitan sektor ini melemah sejak pertengahan Agustus. Artinya perkiraan model makin
            longgar, dan selisih hari ini lebih mungkin berasal dari kabar dalam negeri. Skor di atas{" "}
            {DIVERGENT_THRESHOLD.toFixed(1).replace(".", ",")} dianggap tidak biasa.
          </p>
        </Glass>
      </div>

      <Glass delay={460} style={{ marginBottom: 20 }}>
        <SectorNews
          sector={sector.slug as SectorSlug}
          symbols={contributors.map((c) => `${c.ticker}.JK`)}
        />
      </Glass>

      {report && <CompanyReportPanel report={report} />}

      <footer className="ds-footer">
        <span>Data contoh — akan diganti data asli saat feed tersedia.</span>
        <span>Bukan nasihat investasi. Untuk riset internal.</span>
      </footer>
    </>
  );
}
