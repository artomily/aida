"use client";

import { useMemo, useState } from "react";
import { fmtPct, propagate, upstreamAlert, type AlertLevel } from "../../lib/markets/domino";
import { RELATION_LABEL } from "../../lib/markets/links";
import type { DataSource, LinksPayload, NewsItem, Stock } from "../../lib/markets/types";
import { Glass, SectionHead } from "../ui";
import { NewsList, boardMentions } from "./SectorNews";
import { bare, fmtChange, usePolling } from "./useMarkets";

const LEVEL: Record<AlertLevel, { label: string; hint: string }> = {
  aman: { label: "Aman", hint: "Tidak ada gerak besar atau berita risiko." },
  waspada: { label: "Waspada", hint: "Ada gerak besar atau berita yang perlu dicek." },
  tinggi: { label: "Risiko tinggi", hint: "Gerak besar dan/atau berita risiko — cek emiten IDX terkait." },
};

export default function DominoPanel({ links, stocks }: { links: LinksPayload; stocks: Map<string, Stock> }) {
  const roots = useMemo(
    () => [...new Set(links.links.filter((l) => l.from.endsWith(".SI")).map((l) => l.from))],
    [links],
  );
  const graphSymbols = useMemo(
    () => [...new Set(links.links.flatMap((l) => [l.from, l.to]))],
    [links],
  );
  const { data: newsData } = usePolling<{ source: DataSource; news: NewsItem[] }>(
    graphSymbols.length ? `/api/markets/news?symbols=${graphSymbols.join(",")}` : null,
    120_000,
  );
  const news = newsData?.news ?? [];
  const newsFor = (symbol: string) => news.filter((n) => n.symbols.includes(symbol));

  const cards = roots
    .map((root) => {
      const s = stocks.get(root);
      // Shock of 1% when the SGX name is flat, so sensitivities still show.
      const downstream = propagate({ [root]: (s?.change ?? 0) * 100 || 1 }, links.links, links.sensitivity).filter(
        (i) => i.symbol.endsWith(".JK"),
      );
      // SGX news that names a board member of an IDX emiten in this chain is a risk signal for the chain.
      const chainPeople = Object.fromEntries(
        downstream.filter((d) => links.people[d.symbol]).map((d) => [d.symbol, links.people[d.symbol]]),
      );
      const mentions = news.filter((n) => n.exchange === "SGX" && boardMentions(n, chainPeople).length > 0);
      const own = [...newsFor(root), ...mentions.filter((n) => !n.symbols.includes(root))];
      const alert = upstreamAlert(s?.change ?? null, newsFor(root), mentions);
      return { root, own, alert, downstream, today: s?.change ?? null };
    })
    .filter((c) => c.downstream.length)
    .sort((a, b) => rank(b.alert.level) - rank(a.alert.level) || Math.abs(b.today ?? 0) - Math.abs(a.today ?? 0));

  const [open, setOpen] = useState<string | null>(null);

  return (
    <Glass delay={0}>
      <SectionHead
        title="Efek domino Singapura → Indonesia"
        note="Emiten SGX yang punya hubungan kepemilikan atau grup dengan emiten IDX. Kalau emiten SGX-nya bergerak besar atau diberitakan bermasalah, emiten IDX di bawahnya ikut kami tandai."
        right={
          <div className="ds-legend" style={{ paddingTop: 4 }}>
            {(["tinggi", "waspada", "aman"] as AlertLevel[]).map((l) => (
              <span key={l} title={LEVEL[l].hint}>
                <i className={`mk-dot mk-dot--${l}`} /> {LEVEL[l].label}
              </span>
            ))}
          </div>
        }
      />

      <div className="mk-domino">
        {cards.map((c) => {
          const isOpen = open === c.root;
          const risky = c.own.filter((n) => n.risk || n.sentiment === "bearish");
          return (
            <article key={c.root} className={`mk-chain mk-chain--${c.alert.level}`}>
              <header>
                <div>
                  <span className="mk-ex mk-ex--sgx">SGX</span> <strong>{bare(c.root)}</strong>{" "}
                  <span className="mk-dim">{links.names[c.root]}</span>
                </div>
                <span className={`mk-level mk-level--${c.alert.level}`}>{LEVEL[c.alert.level].label}</span>
              </header>
              <div className="mk-chain-move tnum">
                <span style={{ color: tone(c.today) }}>{fmtChange(c.today)}</span>
                <small>hari ini</small>
              </div>
              {c.alert.reasons.length > 0 && (
                <ul className="mk-reasons">
                  {c.alert.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}

              <div className="mk-arrow" aria-hidden="true">
                ↓ berpengaruh ke
              </div>
              <ul className="mk-down">
                {c.downstream.map((d) => {
                  const idx = stocks.get(d.symbol);
                  const first = links.links.find((l) => l.from === d.path[d.path.length - 2] && l.to === d.symbol);
                  const sens = links.sensitivity.find((x) => x.linkId === first?.id);
                  const perOne = c.today ? d.impact / (c.today * 100) : d.impact;
                  return (
                    <li key={d.symbol}>
                      <div className="mk-down-top">
                        <span>
                          <span className="mk-ex mk-ex--idx">IDX</span> <strong>{bare(d.symbol)}</strong>{" "}
                          <span className="mk-dim">{links.names[d.symbol]}</span>
                        </span>
                        <span className="tnum" style={{ color: tone(idx?.change ?? null), fontWeight: 560 }}>
                          {fmtChange(idx?.change ?? null)}
                        </span>
                      </div>
                      <div className="mk-down-meta">
                        {first && <span>{RELATION_LABEL[first.relation]}</span>}
                        {first?.stake != null && <span>±{Math.round(first.stake * 100)}%</span>}
                        {d.path.length > 2 && <span>lewat {d.path.slice(1, -1).map(bare).join(" → ")}</span>}
                        <span title={sens?.days ? `Dari ${sens.days} hari data harian` : "Perkiraan kasar dari besar kepemilikan"}>
                          Sensitivitas {perOne.toFixed(2).replace(".", ",")}×{sens?.days ? "" : "*"}
                        </span>
                        {c.today ? <span>Perkiraan dampak {fmtPct(d.impact)}</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <button type="button" className="mk-more" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.root)}>
                {isOpen ? "Sembunyikan" : `Lihat dasar hubungan & berita (${c.own.length})`}
              </button>
              {isOpen && (
                <div className="mk-chain-detail">
                  <ul className="mk-basis">
                    {links.links
                      .filter((l) => c.downstream.some((d) => d.path.includes(l.to)) && (l.from === c.root || c.downstream.some((d) => d.path.includes(l.from))))
                      .map((l) => (
                        <li key={l.id}>
                          {l.basis}
                          <span className="mk-dim"> · {l.origin === "kurasi" ? "kurasi manual" : "terdeteksi dari data kepemilikan"}</span>
                        </li>
                      ))}
                  </ul>
                  <NewsList
                    items={[...risky, ...c.own.filter((n) => !risky.includes(n))].slice(0, 5)}
                    people={links.people}
                    empty="Belum ada berita tentang emiten ini dalam 7 hari terakhir."
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="ds-note" style={{ margin: "16px 0 0" }}>
        *Sensitivitas bertanda bintang adalah perkiraan kasar dari besar kepemilikan karena data harga belum cukup.
        Lainnya dihitung dari pergerakan harian 90 hari terakhir. Persentase kepemilikan bersifat perkiraan — cek
        keterbukaan informasi terbaru sebelum mengutip.
      </p>

      <Simulator links={links} roots={roots} />
    </Glass>
  );
}

/** "What if this SGX name falls 10%?" — pushes a hypothetical shock through the same graph. */
function Simulator({ links, roots }: { links: LinksPayload; roots: string[] }) {
  const [root, setRoot] = useState(roots[0] ?? "");
  const [shock, setShock] = useState(-10);
  const impacts = useMemo(
    () => (root ? propagate({ [root]: shock }, links.links, links.sensitivity).filter((i) => i.symbol.endsWith(".JK")) : []),
    [root, shock, links],
  );
  if (!roots.length) return null;

  return (
    <div className="mk-sim">
      <h3 className="ds-h2" style={{ fontSize: 18 }}>
        Simulasi: bagaimana kalau…
      </h3>
      <p className="ds-note" style={{ margin: "4px 0 16px" }}>
        Pilih emiten SGX dan besar guncangannya. Ini hitungan skenario, bukan ramalan.
      </p>
      <div className="mk-sim-controls">
        <label className="ds-chip ds-pill">
          <span>Emiten SGX</span>
          <select value={root} onChange={(e) => setRoot(e.target.value)}>
            {roots.map((r) => (
              <option key={r} value={r}>
                {bare(r)} · {links.names[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="mk-slider">
          <span>
            Bergerak <b className="tnum" style={{ color: shock < 0 ? "var(--neg)" : shock > 0 ? "var(--pos)" : undefined }}>{fmtPct(shock, 0)}</b>
          </span>
          <input type="range" min={-30} max={30} step={1} value={shock} onChange={(e) => setShock(+e.target.value)} />
        </label>
      </div>
      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Emiten IDX</th>
              <th style={{ textAlign: "left" }}>Jalur</th>
              <th style={{ textAlign: "right" }}>Perkiraan dampak</th>
            </tr>
          </thead>
          <tbody>
            {impacts.map((i) => (
              <tr key={i.symbol}>
                <td>
                  <strong style={{ fontWeight: 560 }}>{bare(i.symbol)}</strong>{" "}
                  <span className="mk-dim">{links.names[i.symbol]}</span>
                </td>
                <td className="mk-dim">{i.path.map(bare).join(" → ")}</td>
                <td className="tnum" style={{ textAlign: "right", fontWeight: 560, color: i.impact < 0 ? "var(--neg)" : "var(--pos)" }}>
                  {fmtPct(i.impact)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const rank = (l: AlertLevel) => ({ aman: 0, waspada: 1, tinggi: 2 })[l];
const tone = (v: number | null) => (v == null || v === 0 ? undefined : v > 0 ? "var(--pos)" : "var(--neg)");
