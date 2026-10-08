import type { Metadata } from "next";
import Link from "next/link";
import type { Snapshot, SectorScore } from "../../scoring/types";
import { ATTENTION_MAX, EmptyState, Footer } from "../components/score";
import SiteHeader from "../components/SiteHeader";
import { SectorsPanel } from "../components/Structure";
import { NEG, POS } from "../components/ui";
import { requireUser } from "../lib/auth";
import { loadSnapshot } from "../lib/data";
import { dateLabel, dec, eventLabel, pct, pval, timeLabel } from "../lib/format";
import "./terminal.css";

export const metadata: Metadata = {
  title: "Aida — sektor IDX yang layak dicek hari ini",
  description: "Skor perhatian sektor IDX dari keterkaitan struktural dengan SGX, sensitivitas historis, aliran orang dalam, dan pemicu berita.",
};

export default async function Board() {
  await requireUser("/dashboard");
  const snapshot = await loadSnapshot();

  return (
    <div className="ds-shell tm-shell">
      <SiteHeader current="board" sectorHref={snapshot ? `/sector/${snapshot.sectors[0].slug}` : undefined} />
      <main>{snapshot ? <Terminal snapshot={snapshot} /> : <EmptyState />}</main>
      <Footer snapshot={snapshot} />
    </div>
  );
}

function Terminal({ snapshot }: { snapshot: Snapshot }) {
  const v = snapshot.validation;
  const top = snapshot.sectors[0];
  const events = snapshot.sectors
    .flatMap((s) => s.trigger.events.map((e) => ({ ...e, sector: s })))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const insiders = snapshot.sectors.reduce((n, s) => n + s.flow.count, 0);

  return (
    <>
      <div className="tm-status">
        <span className="tm-dot" />
        <span>SNAPSHOT HARIAN</span>
        <span className="tm-sep" />
        <span>{dateLabel(snapshot.date)}</span>
        <span className="tm-sep" />
        <span className="tnum">{timeLabel(snapshot.generatedAt)} WIB</span>
        {snapshot.notes.length > 0 && (
          <span className="tm-status-note" title={snapshot.notes.join("\n")}>
            {snapshot.notes.length} catatan pipeline
          </span>
        )}
      </div>

      <section className="tm-kpis">
        <Kpi label="Teratas" value={top.name} sub={`Perhatian ${dec(top.attention)} / ${dec(ATTENTION_MAX, 1)}`} />
        <Kpi label="Lead-lag SGX signifikan" value={`${v.significant}/11`} sub={`BH, α = ${dec(v.alpha, 2)}`} />
        <Kpi label="Sektor dengan pemicu" value={String(snapshot.sectors.filter((s) => s.trigger.events.length).length)} sub={`${events.length} peristiwa, 3 hari`} />
        <Kpi label="Transaksi orang dalam" value={String(insiders)} sub="30 hari" />
        <Kpi label="Riwayat" value={`${v.history.days} hr`} sub={`jendela ${v.window} hari`} />
      </section>

      <section className="tm-panel tm-rank">
        <PanelHead title="Peringkat sektor" right={<Link href="/methodology#rumus">Rumus ↗</Link>} />
        <div className="tm-table-wrap">
          <table className="tm-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="l">Sektor</th>
                <th className="l">Perhatian</th>
                <th>Eksposur</th>
                <th>β SGX</th>
                <th>p adj</th>
                <th>Flow 30h</th>
                <th className="l">Pemicu</th>
                <th>Korelasi 60h</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.sectors.map((s) => (
                <Row key={s.slug} s={s} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="tm-row">
        <section className="tm-panel tm-heat-panel">
          <PanelHead title="Peta perhatian" right={<span>0 – {dec(ATTENTION_MAX, 1)}</span>} />
          <div className="tm-heat">
            {snapshot.sectors.map((s) => (
              <Link
                key={s.slug}
                href={`/sector/${s.slug}`}
                className={`tm-tile${s.rank === 1 ? " tm-tile--lead" : ""}`}
                style={{ background: heat(s.attention) }}
              >
                <span>{s.name}</span>
                <b className="tnum">{dec(s.attention)}</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="tm-panel">
          <PanelHead title="Pemicu terbaru" right={<span>{events.length}</span>} />
          {events.length ? (
            <ul className="tm-feed">
              {events.slice(0, 8).map((e) => (
                <li key={`${e.sector.slug}-${e.newsId}`}>
                  <span className="tm-feed-time tnum">{timeLabel(e.publishedAt)}</span>
                  <span className="tm-feed-body">
                    <span className={`tm-tag tm-tag--${e.direction > 0 ? "pos" : e.direction < 0 ? "neg" : "flat"}`}>{eventLabel(e.type)}</span>
                    <span className="tm-feed-entity">{e.entity}</span>
                    <Link href={`/sector/${e.sector.slug}`} className="tm-feed-sector">
                      {e.sector.name}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tm-empty">Tidak ada pemicu dalam 3 hari terakhir.</p>
          )}
        </section>

        <section className="tm-panel">
          <PanelHead title="Ringkasan pagi" right={<span>{snapshot.brief.by === "llm" ? "LLM" : "otomatis"}</span>} />
          <p className="tm-brief">{snapshot.brief.text}</p>
        </section>
      </div>

      <SectorsPanel snapshot={snapshot} />
    </>
  );
}

function Row({ s }: { s: SectorScore }) {
  const sens = s.sensitivity;
  return (
    <tr>
      <td className="tm-dim">{s.rank}</td>
      <td className="l">
        <Link href={`/sector/${s.slug}`} className="tm-name">
          {s.name}
        </Link>
      </td>
      <td className="l">
        <span className="tm-att">
          <span className="tm-bar">
            <i style={{ width: `${Math.min(1, s.attention / ATTENTION_MAX) * 100}%` }} />
          </span>
          <b>{dec(s.attention)}</b>
        </span>
      </td>
      <td>{pct(s.exposure.score, 1)}</td>
      <td>{sens.beta === null ? <span className="tm-dim">—</span> : dec(sens.beta, 3)}</td>
      <td style={{ color: sens.significant ? "var(--ok-ink)" : "var(--dim)" }}>{sens.pAdjusted == null ? "—" : pval(sens.pAdjusted)}</td>
      <td style={{ color: s.flow.count ? (s.flow.score >= 0 ? POS : NEG) : "var(--dim)" }}>
        {s.flow.count ? `${s.flow.buys}B / ${s.flow.sells}S` : "—"}
      </td>
      <td className="l">
        {s.trigger.events.length ? (
          <span className={`tm-tag tm-tag--${s.trigger.score > 0 ? "pos" : s.trigger.score < 0 ? "neg" : "flat"}`}>
            {eventLabel(s.trigger.events[0].type)}
            {s.trigger.events.length > 1 ? ` +${s.trigger.events.length - 1}` : ""}
          </span>
        ) : (
          <span className="tm-dim">—</span>
        )}
      </td>
      <td>
        <span className="tm-spark-cell">
          <Spark points={s.confidence.series.map((p) => p.value)} />
          <span>{s.confidence.latest == null ? "—" : dec(s.confidence.latest)}</span>
        </span>
      </td>
    </tr>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="tm-kpi">
      <span className="tm-kpi-label">{label}</span>
      <b className="tm-kpi-value">{value}</b>
      <span className="tm-kpi-sub">{sub}</span>
    </div>
  );
}

function PanelHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="tm-panel-head">
      <h2>{title}</h2>
      {right && <span className="tm-panel-right">{right}</span>}
    </header>
  );
}

/** Rolling correlation, last 60 points, zero line dashed. */
function Spark({ points }: { points: number[] }) {
  const pts = points.slice(-60);
  if (pts.length < 2) return <svg className="tm-spark" />;
  const W = 72, H = 20;
  const y = (v: number) => H / 2 - Math.max(-1, Math.min(1, v)) * (H / 2 - 1);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = pts.at(-1)!;
  return (
    <svg className="tm-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--hair)" strokeDasharray="2 2" />
      <path d={d} fill="none" stroke={last >= 0 ? POS : NEG} strokeWidth="1.25" />
    </svg>
  );
}

/** Sequential teal ramp for attention, dark → bright. */
function heat(v: number, alpha = 0.9) {
  const t = Math.max(0, Math.min(1, v / ATTENTION_MAX));
  const l = 16 + t * 42;
  const c = 0.03 + t * 0.09;
  return `oklch(${l}% ${c} 200 / ${alpha})`;
}
