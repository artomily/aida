/** Sector → sub-sector → emiten breakdown, read from the snapshot's `structure`. */
import Link from "next/link";
import type { SectorStructure, Snapshot } from "../../scoring/types";
import { bare, idr, pct } from "../lib/format";
import { Glass, SectionHead } from "./ui";

const MISSING = "Belum ada di snapshot ini — muncul setelah universe emiten di-ingest ulang dengan subsektor.";

/** Sector page: every sub-sector with its share of the sector and its largest emiten. */
export function SubsectorCard({ structure }: { structure?: SectorStructure }) {
  return (
    <Glass style={{ marginBottom: 12 }}>
      <SectionHead
        title={
          <>
            Subsektor & emiten{" "}
            {structure && (
              <span className="dv-score">
                {structure.subsectors.length} subsektor · {structure.companies} emiten · {idr(structure.marketCap)}
              </span>
            )}
          </>
        }
        note="Kapitalisasi pasar IDX per subsektor, dengan lima emiten terbesar di tiap subsektor."
      />
      {structure ? (
        <div className="st-subs">
          {structure.subsectors.map((sub) => {
            const share = structure.marketCap ? sub.marketCap / structure.marketCap : 0;
            return (
              <section key={sub.name} className="st-sub">
                <header>
                  <b>{sub.name}</b>
                  <span className="tnum">{pct(share, 1)}</span>
                </header>
                <span className="st-bar" aria-hidden="true">
                  <i style={{ width: `${share * 100}%` }} />
                </span>
                <span className="st-meta tnum">
                  {sub.companies} emiten · {idr(sub.marketCap)}
                </span>
                <ol>
                  {sub.top.map((c) => (
                    <li key={c.symbol}>
                      <span className="st-tick">{bare(c.symbol)}</span>
                      <span className="st-name">{c.name}</span>
                      <span className="tnum">{idr(c.marketCap)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="st-empty">{MISSING}</p>
      )}
    </Glass>
  );
}

/** Dashboard: all 11 sectors with their sub-sectors as chips. */
export function SectorsPanel({ snapshot }: { snapshot: Snapshot }) {
  const st = snapshot.structure;
  return (
    <section className="tm-panel" style={{ marginTop: 12 }}>
      <header className="tm-panel-head">
        <h2>Sektor & subsektor</h2>
        <span className="tm-panel-right">IDX-IC</span>
      </header>
      {st ? (
        <div className="st-grid">
          {snapshot.sectors.map((s) => {
            const sec = st[s.slug];
            return (
              <Link key={s.slug} href={`/sector/${s.slug}`} className="st-sector">
                <header>
                  <b>{s.name}</b>
                  <span className="tnum">{sec ? `${sec.companies} emiten` : "—"}</span>
                </header>
                <span className="st-meta tnum">{sec ? idr(sec.marketCap) : "tidak ada data"}</span>
                {sec && (
                  <span className="st-chips">
                    {sec.subsectors.map((sub) => (
                      <span key={sub.name} className="st-chip">
                        {sub.name} <em className="tnum">{sub.companies}</em>
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="st-empty">{MISSING}</p>
      )}
    </section>
  );
}
