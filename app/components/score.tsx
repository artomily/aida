/** Server-rendered pieces shared by the board, sector and methodology pages. */
import type { ReactNode } from "react";
import type { Snapshot } from "../../scoring/types";
import { dateLabel, dec, timeLabel } from "../lib/format";
import { Cta, Glass } from "./ui";

/** Highest possible attention: Base 1 × (0.5 + 1) × (1 + 1 + 1). */
export const ATTENTION_MAX = 4.5;

/** One-sided bar, 0 → max. */
export function Bar({ value, max = 1, color = "var(--track-fill)" }: { value: number; max?: number; color?: string }) {
  return (
    <span className="dv-bar" aria-hidden="true">
      <i style={{ width: `${Math.max(0, Math.min(1, value / max)) * 100}%`, background: color }} />
    </span>
  );
}

export function Pill({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "ok" | "bad" | "plain" }) {
  return <span className={`dv-pill dv-pill--${tone}`}>{children}</span>;
}

export function DataChip({ snapshot }: { snapshot: Snapshot }) {
  return (
    <span className="ds-chip ds-pill" style={{ height: 30, padding: "0 12px", fontSize: 13 }}>
      <i style={snapshot.mode === "mock" ? { background: "var(--warn-ink)" } : undefined} />
      {snapshot.mode === "mock" ? "Data sintetis (server mock)" : `Snapshot ${timeLabel(snapshot.generatedAt)} WIB`}
    </span>
  );
}

/** Mock data and pipeline caveats, said up front rather than in a footnote. */
export function Notices({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot.mode !== "mock" && !snapshot.notes.length) return null;
  return (
    <Glass delay={0} className="dv-notice">
      {snapshot.mode === "mock" && (
        <p>
          <strong>Mode mock.</strong> Angka di halaman ini dihitung dari data sintetis server mock lokal untuk menguji
          pipeline — bukan data pasar.
        </p>
      )}
      {snapshot.notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </Glass>
  );
}

export function EmptyState() {
  return (
    <Glass delay={0}>
      <h2 className="ds-h2">Belum ada snapshot</h2>
      <p className="ds-body" style={{ marginTop: 10 }}>
        Dasbor hanya membaca satu snapshot harian yang sudah dihitung — ia tidak pernah memanggil sectors.app saat halaman
        dibuka. Snapshot pertama dibuat oleh backfill:
      </p>
      <pre className="dv-code">{`npm run ingest:backfill -- --plan   # perkiraan kredit, tanpa memanggil API
npm run ingest:backfill -- --yes    # jalankan`}</pre>
      <div style={{ marginTop: 18 }}>
        <Cta variant="glass" href="/methodology">
          Baca metodologi
        </Cta>
      </div>
    </Glass>
  );
}

export function Footer({ snapshot }: { snapshot?: Snapshot | null }) {
  return (
    <footer className="ds-footer">
      <span>
        Sumber: sectors.app — hanya nilai turunan (skor, beta, bobot, jumlah) yang ditampilkan.
        {snapshot ? ` Snapshot ${dateLabel(snapshot.date)}.` : ""}
      </span>
      <span>Bukan nasihat investasi. Skor perhatian menunjukkan ke mana riset diarahkan, bukan apa yang dibeli atau dijual.</span>
    </footer>
  );
}

/** Rolling-correlation line, −1…1 with a zero baseline. */
export function CorrelationChart({ series }: { series: { date: string; value: number }[] }) {
  if (series.length < 2) return <p className="ds-note">Riwayat belum cukup untuk korelasi bergulir 60 hari.</p>;
  const W = 300;
  const H = 120;
  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => H / 2 - v * (H / 2 - 6);
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const last = series[series.length - 1];
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: H, display: "block" }}
        role="img"
        aria-label={`Korelasi bergulir 60 hari, terakhir ${dec(last.value)}`}
      >
        <line x1="0" y1={y(0)} x2={W} y2={y(0)} stroke="var(--slash)" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={y(1)} x2={W} y2={y(1)} stroke="rgb(var(--line) / 0.18)" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={y(-1)} x2={W} y2={y(-1)} stroke="rgb(var(--line) / 0.18)" vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke="var(--pos)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="tnum dv-axis">
        <span>{series[0].date}</span>
        <span>0 = tidak terkait</span>
        <span>{last.date}</span>
      </figcaption>
    </figure>
  );
}
