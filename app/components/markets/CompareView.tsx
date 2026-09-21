"use client";

import { useMemo, useState } from "react";
import { NEG, POS } from "../../lib/model";
import { SECTOR_NAME, SECTOR_ORDER } from "../../lib/markets/sectors";
import type { Exchange, LinksPayload, MarketOverview, SectorSlug, Stock } from "../../lib/markets/types";
import { Arrow, Glass, Hero, MeterPanel, SectionHead, TargetIcon } from "../ui";
import DominoPanel from "./DominoPanel";
import SectorNews from "./SectorNews";
import { EXCHANGE_LABEL, POLL_MS, bare, fmtChange, fmtPrice, sectorStats, usePolling } from "./useMarkets";

const tone = (v: number | null) => (v == null || Math.abs(v) < 0.0005 ? undefined : v > 0 ? POS : NEG);

export default function CompareView() {
  const overview = usePolling<MarketOverview>("/api/markets/overview", POLL_MS);
  const links = usePolling<LinksPayload>("/api/markets/links", POLL_MS);
  const data = overview.data;

  const bySector = useMemo(() => {
    const group = (list: Stock[]) =>
      Object.fromEntries(SECTOR_ORDER.map((s) => [s.slug, list.filter((x) => x.sector === s.slug)])) as Record<
        SectorSlug,
        Stock[]
      >;
    return data ? { SGX: group(data.sgx), IDX: group(data.idx) } : null;
  }, [data]);

  const rows = useMemo(
    () =>
      bySector
        ? SECTOR_ORDER.map((s) => {
            const sgx = sectorStats(bySector.SGX[s.slug]);
            const idx = sectorStats(bySector.IDX[s.slug]);
            const same = sgx.avg != null && idx.avg != null && Math.sign(sgx.avg) === Math.sign(idx.avg);
            const gap = sgx.avg != null && idx.avg != null ? idx.avg - sgx.avg : 0;
            return { ...s, sgx, idx, same, gap };
          })
        : [],
    [bySector],
  );

  const widest = [...rows].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
  const [picked, setPicked] = useState<SectorSlug | null>(null);
  const sector = picked ?? widest?.slug ?? "financials";
  const sameCount = rows.filter((r) => r.same).length;

  // Picked sub-sector per exchange; tied to the sector it was picked in, so switching sector clears it.
  const [sub, setSub] = useState<{ sector: SectorSlug; SGX: string | null; IDX: string | null }>({
    sector,
    SGX: null,
    IDX: null,
  });
  const subFor = (ex: Exchange) => (sub.sector === sector ? sub[ex] : null);
  const pickSub = (ex: Exchange, name: string | null) =>
    setSub((s) => ({ ...(s.sector === sector ? s : { SGX: null, IDX: null }), sector, [ex]: name }));

  const stocks = useMemo(() => new Map([...(data?.idx ?? []), ...(data?.sgx ?? [])].map((s) => [s.symbol, s])), [data]);

  // Linked symbols in this sector go into the news query, so their news shows even if tagged elsewhere.
  const inSector = new Set(bySector ? [...bySector.SGX[sector], ...bySector.IDX[sector]].map((s) => s.symbol) : []);
  const sectorLinked = [...new Set((links.data?.links ?? []).flatMap((l) => [l.from, l.to]).filter((s) => inSector.has(s)))];

  if (!data || !bySector) {
    return (
      <Glass>
        <p className="ds-body">{overview.error ? `Data belum bisa dimuat (${overview.error}).` : "Memuat data SGX dan IDX…"}</p>
      </Glass>
    );
  }

  const w = widest;
  return (
    <>
      <Hero
        eyebrow={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Singapura × Indonesia · {data.idx.length + data.sgx.length} saham
            <span className="ds-chip ds-pill" style={{ height: 30, padding: "0 12px", fontSize: 13 }}>
              <i style={data.source.provider === "contoh" ? { background: "#c9a227" } : undefined} />
              {data.source.provider === "contoh" ? "Data contoh" : `sectors.app · ${new Date(data.source.fetchedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </span>
        }
        title={
          <>
            Dua bursa,
            <br />
            satu layar
          </>
        }
        tag={
          w && w.sgx.avg != null && w.idx.avg != null ? (
            <>
              Beda paling jauh di <strong style={{ fontWeight: 560 }}>{w.name}</strong>: Singapura {fmtChange(w.sgx.avg)},
              Indonesia {fmtChange(w.idx.avg)}.
            </>
          ) : (
            "Bandingkan pergerakan tiap sektor di SGX dan IDX hari ini."
          )
        }
        aside={
          <MeterPanel
            title="Searah hari ini"
            icon={<TargetIcon />}
            big={`${sameCount} / ${rows.length}`}
            sub={
              <>
                sektor bergerak ke arah
                <br />
                yang sama di kedua bursa.
              </>
            }
            scale={["0", "3", "6", "9", "11"]}
            fill={sameCount / Math.max(rows.length, 1)}
            label={`${sameCount} dari ${rows.length} sektor searah`}
          />
        }
      />

      {data.source.note && (
        <Glass delay={0} className="mk-banner">
          <strong>{data.source.provider === "contoh" ? "Mode contoh." : "Catatan data."}</strong> {data.source.note}{" "}
          {data.source.provider === "contoh" && (
            <>
              Isi <code>SECTORS_API_KEY</code> di <code>.env.local</code> lalu muat ulang untuk seluruh saham SGX & IDX dan
              berita asli.
            </>
          )}
        </Glass>
      )}

      <div className="ds-grid mk-pair">
        {(["SGX", "IDX"] as Exchange[]).map((ex, k) => (
          <Glass key={ex} delay={200 + k * 60}>
            <SectionHead
              title={
                <>
                  <span className={`mk-ex mk-ex--${ex.toLowerCase()}`}>{ex}</span> {EXCHANGE_LABEL[ex].long}
                </>
              }
              note={`${(ex === "SGX" ? data.sgx : data.idx).length} saham · rata-rata tertimbang kapitalisasi. Klik sektor untuk detail.`}
            />
            <div role="listbox" aria-label={`Sektor ${ex}`} className="mk-sectors">
              {rows.map((r) => {
                const st = ex === "SGX" ? r.sgx : r.idx;
                const total = st.up + st.down || 1;
                return (
                  <button
                    key={r.slug}
                    type="button"
                    role="option"
                    aria-selected={r.slug === sector}
                    className="mk-sector"
                    onClick={() => setPicked(r.slug)}
                  >
                    <span className="mk-sector-name">
                      {r.name}
                      <small>{st.count} saham</small>
                    </span>
                    <span className="mk-breadth" aria-label={`${st.up} naik, ${st.down} turun`}>
                      <i style={{ width: `${(st.up / total) * 100}%`, background: POS }} />
                      <i style={{ width: `${(st.down / total) * 100}%`, background: NEG }} />
                    </span>
                    <span className="mk-sector-chg tnum" style={{ color: tone(st.avg) }}>
                      {st.avg != null && <Arrow v={st.avg} />}
                      {fmtChange(st.avg)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Glass>
        ))}
      </div>

      <Glass delay={0} style={{ marginBottom: 20 }}>
        <SectionHead
          title={`Subsektor ${SECTOR_NAME[sector]}`}
          note="Tiap bursa memakai klasifikasi subsektornya sendiri. Klik subsektor untuk menyaring daftar saham di bawah."
        />
        <div className="ds-grid mk-pair" style={{ marginBottom: 0 }}>
          {(["SGX", "IDX"] as Exchange[]).map((ex) => (
            <SubsectorList
              key={ex}
              exchange={ex}
              stocks={bySector[ex][sector]}
              picked={subFor(ex)}
              onPick={(name) => pickSub(ex, name)}
            />
          ))}
        </div>
      </Glass>

      <Glass delay={0} style={{ marginBottom: 20 }}>
        <SectionHead
          title={`Sektor ${SECTOR_NAME[sector]}: Singapura vs Indonesia`}
          note="Saham terbesar di tiap bursa, lalu berita terbaru sektor ini dari kedua bursa."
          right={
            <label className="ds-chip ds-pill">
              <span>Sektor</span>
              <select value={sector} onChange={(e) => setPicked(e.target.value as SectorSlug)} className="mk-select">
                {SECTOR_ORDER.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          }
        />
        <div className="mk-detail">
          <div className="mk-pair mk-pair--tight">
            {(["SGX", "IDX"] as Exchange[]).map((ex) => (
              <StockTable
                key={`${ex}-${sector}-${subFor(ex)}`}
                exchange={ex}
                stocks={bySector[ex][sector].filter((s) => !subFor(ex) || s.subSector === subFor(ex))}
                subSector={subFor(ex)}
                onClearSub={() => pickSub(ex, null)}
                linked={new Set(sectorLinked)}
              />
            ))}
          </div>
          <SectorNews sector={sector} symbols={sectorLinked} people={links.data?.people} />
        </div>
      </Glass>

      {links.data ? (
        <DominoPanel links={links.data} stocks={stocks} />
      ) : (
        <Glass>
          <p className="ds-note">{links.error ? `Peta keterkaitan belum bisa dimuat (${links.error}).` : "Memuat peta keterkaitan…"}</p>
        </Glass>
      )}

      <footer className="ds-footer">
        <span>Sumber: sectors.app (harga penutupan harian & berita). Hubungan kepemilikan: kurasi + laporan kepemilikan.</span>
        <span>Bukan nasihat investasi.</span>
      </footer>
    </>
  );
}

const NO_SUB = "Tanpa subsektor";

/** One exchange's sub-sectors inside the picked sector, largest first. */
function SubsectorList({
  exchange,
  stocks,
  picked,
  onPick,
}: {
  exchange: Exchange;
  stocks: Stock[];
  picked: string | null;
  onPick: (name: string | null) => void;
}) {
  const groups = new Map<string, Stock[]>();
  for (const s of stocks) {
    const k = s.subSector ?? NO_SUB;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const list = [...groups.entries()]
    .map(([name, members]) => ({
      name,
      stats: sectorStats(members),
      cap: members.reduce((a, m) => a + (m.marketCap ?? 0), 0),
    }))
    .sort((a, b) => b.cap - a.cap || b.stats.count - a.stats.count || a.name.localeCompare(b.name));

  return (
    <div>
      <h3 className="ds-h2" style={{ fontSize: 16, marginBottom: 8 }}>
        <span className={`mk-ex mk-ex--${exchange.toLowerCase()}`}>{exchange}</span> {list.length} subsektor
      </h3>
      {list.length === 0 ? (
        <p className="ds-note">Tidak ada saham di sektor ini.</p>
      ) : (
        <div role="listbox" aria-label={`Subsektor ${exchange}`} className="mk-sectors">
          {list.map((g) => {
            const total = g.stats.up + g.stats.down || 1;
            const selected = picked === g.name;
            return (
              <button
                key={g.name}
                type="button"
                role="option"
                aria-selected={selected}
                className="mk-sector"
                onClick={() => onPick(selected ? null : g.name === NO_SUB ? null : g.name)}
              >
                <span className="mk-sector-name">
                  {g.name}
                  <small>{g.stats.count} saham</small>
                </span>
                <span className="mk-breadth" aria-label={`${g.stats.up} naik, ${g.stats.down} turun`}>
                  <i style={{ width: `${(g.stats.up / total) * 100}%`, background: POS }} />
                  <i style={{ width: `${(g.stats.down / total) * 100}%`, background: NEG }} />
                </span>
                <span className="mk-sector-chg tnum" style={{ color: tone(g.stats.avg) }}>
                  {g.stats.avg != null && <Arrow v={g.stats.avg} />}
                  {fmtChange(g.stats.avg)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StockTable({
  exchange,
  stocks,
  linked,
  subSector,
  onClearSub,
}: {
  exchange: Exchange;
  stocks: Stock[];
  linked: Set<string>;
  subSector: string | null;
  onClearSub: () => void;
}) {
  const [all, setAll] = useState(false);
  const sorted = [...stocks].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
  const shown = all ? sorted : sorted.slice(0, 8);
  return (
    <div>
      <h3 className="ds-h2" style={{ fontSize: 16, marginBottom: 8 }}>
        <span className={`mk-ex mk-ex--${exchange.toLowerCase()}`}>{exchange}</span> {EXCHANGE_LABEL[exchange].long}
        {subSector && (
          <button type="button" className="mk-chip mk-chip--filter" onClick={onClearSub} aria-label={`Hapus filter ${subSector}`}>
            {subSector} ✕
          </button>
        )}
      </h3>
      {shown.length === 0 ? (
        <p className="ds-note">Tidak ada saham di sektor ini.</p>
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table mk-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Saham</th>
                <th style={{ textAlign: "right" }}>Harga</th>
                <th style={{ textAlign: "right" }}>Hari ini</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.symbol}>
                  <td>
                    <strong style={{ fontWeight: 560 }}>{bare(s.symbol)}</strong>
                    {linked.has(s.symbol) && (
                      <span className="mk-chip mk-chip--link" title="Punya hubungan kepemilikan lintas bursa">
                        terkait
                      </span>
                    )}
                    <div className="mk-dim mk-ellipsis">{s.name}</div>
                  </td>
                  <td className="tnum" style={{ textAlign: "right" }}>
                    {fmtPrice(s)}
                  </td>
                  <td className="tnum" style={{ textAlign: "right", color: tone(s.change), fontWeight: 520 }}>
                    {fmtChange(s.change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sorted.length > 8 && (
        <button type="button" className="mk-more" onClick={() => setAll(!all)}>
          {all ? "Tampilkan 8 teratas" : `Tampilkan semua (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
