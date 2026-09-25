import type { Metadata } from "next";
import Link from "next/link";
import { ATTENTION_MAX, Bar, DataChip, EmptyState, Footer, Notices, Pill } from "./components/score";
import SiteHeader from "./components/SiteHeader";
import { Arrow, Glass, GuidePill, Hero, MeterPanel, NEG, POS, SectionHead, ShieldIcon, StatRow } from "./components/ui";
import { loadSnapshot } from "./lib/data";
import { dateLabel, dec, eventLabel, pct, pval } from "./lib/format";

export const metadata: Metadata = {
  title: "Divergence — sektor IDX yang layak dicek hari ini",
  description: "Skor perhatian sektor IDX dari keterkaitan struktural dengan SGX, sensitivitas historis, aliran orang dalam, dan pemicu berita.",
};

export default async function Board() {
  const snapshot = await loadSnapshot();

  return (
    <>
      <div className="ds-plate" aria-hidden="true" />
      <div className="ds-shell">
        <SiteHeader current="board" sectorHref={snapshot ? `/sector/${snapshot.sectors[0].slug}` : undefined} />
        <main>{snapshot ? <Ranking snapshot={snapshot} /> : <EmptyState />}</main>
        <Footer snapshot={snapshot} />
      </div>
    </>
  );
}

function Ranking({ snapshot }: { snapshot: NonNullable<Awaited<ReturnType<typeof loadSnapshot>>> }) {
  const v = snapshot.validation;
  const top = snapshot.sectors[0];
  const triggered = snapshot.sectors.filter((s) => s.trigger.events.length).length;

  return (
    <>
      <Hero
        eyebrow={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Skor perhatian · {dateLabel(snapshot.date)}
            <DataChip snapshot={snapshot} />
          </span>
        }
        title={
          <>
            {top.name}
            <br />
            paling layak dicek
          </>
        }
        tag="Diurutkan menurut seberapa terhubung sektor itu ke SGX, seberapa responsif secara historis, dan apa pemicunya hari ini."
        aside={
          <MeterPanel
            title="Uji lead-lag SGX"
            icon={<ShieldIcon />}
            big={`${v.significant} / 11`}
            sub={
              <>
                sektor dengan beta SGX
                <br />
                signifikan setelah koreksi
                <br />
                Benjamini–Hochberg.
              </>
            }
            scale={["0", "3", "6", "9", "11"]}
            fill={v.significant / 11}
            label={`${v.significant} dari 11 sektor signifikan`}
          />
        }
      />

      <div className="ds-statrow">
        <StatRow
          items={[
            { value: dec(top.attention), label: <>Skor perhatian<br />tertinggi</> },
            { value: triggered, label: <>Sektor dengan<br />pemicu berita</> },
            { value: v.history.days, label: <>Hari bursa<br />dalam riwayat</> },
          ]}
        />
        <GuidePill href="/methodology#rumus">Cara skor dihitung</GuidePill>
      </div>

      <Notices snapshot={snapshot} />

      <Glass delay={260} style={{ marginBottom: 20 }}>
        <SectionHead
          title="Ringkasan pagi"
          note={snapshot.brief.by === "llm" ? "Disusun model bahasa dari skor yang sudah dihitung — tidak mengubah angka." : "Disusun otomatis dari skor yang sudah dihitung."}
        />
        <p className="ds-body">{snapshot.brief.text}</p>
      </Glass>

      <Glass delay={300}>
        <SectionHead
          title="Peringkat 11 sektor IDX"
          note="Perhatian = Eksposur × (0,5 + Sensitivitas) × (1 + Flow + Pemicu). Sektor harus terhubung, responsif secara historis, dan punya pemicu hari ini untuk naik ke atas. Keyakinan ditampilkan terpisah."
        />
        <div className="ds-table-wrap">
          <table className="ds-table dv-rank">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>#</th>
                <th style={{ textAlign: "left" }}>Sektor</th>
                <th style={{ textAlign: "left" }}>
                  Perhatian<small>0 – 4,5</small>
                </th>
                <th style={{ textAlign: "right" }}>
                  Eksposur<small>porsi kapitalisasi terhubung</small>
                </th>
                <th style={{ textAlign: "right" }}>
                  Sensitivitas<small>β · p terkoreksi</small>
                </th>
                <th style={{ textAlign: "right" }}>
                  Flow<small>orang dalam, 30 hari</small>
                </th>
                <th style={{ textAlign: "left" }}>
                  Pemicu<small>berita SGX, 3 hari</small>
                </th>
                <th style={{ textAlign: "right" }}>
                  Keyakinan<small>korelasi 60 hari</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshot.sectors.map((s) => (
                <tr key={s.slug}>
                  <td className="tnum" style={{ textAlign: "right", color: "var(--muted)" }}>
                    {s.rank}
                  </td>
                  <td>
                    <Link className="ds-link" href={`/sector/${s.slug}`}>
                      {s.name}
                    </Link>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Bar value={s.attention} max={ATTENTION_MAX} />
                      <b className="tnum" style={{ fontWeight: 560 }}>
                        {dec(s.attention)}
                      </b>
                    </span>
                  </td>
                  <td className="tnum" style={{ textAlign: "right" }}>
                    {pct(s.exposure.score, 1)}
                  </td>
                  <td className="tnum" style={{ textAlign: "right" }}>
                    {s.sensitivity.beta === null ? (
                      <span style={{ color: "var(--dim)" }}>belum diuji</span>
                    ) : (
                      <>
                        {dec(s.sensitivity.beta, 3)}{" "}
                        <span style={{ color: s.sensitivity.significant ? "var(--ok-ink)" : "var(--dim)" }}>
                          · {pval(s.sensitivity.pAdjusted)}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="tnum" style={{ textAlign: "right", color: s.flow.count ? (s.flow.score >= 0 ? POS : NEG) : "var(--dim)" }}>
                    {s.flow.count ? (
                      <>
                        <Arrow v={s.flow.score} />
                        {s.flow.count} tx
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {s.trigger.events.length ? (
                      <Pill tone={s.trigger.score < 0 ? "bad" : s.trigger.score > 0 ? "ok" : "plain"}>
                        {eventLabel(s.trigger.events[0].type)}
                        {s.trigger.events.length > 1 ? ` +${s.trigger.events.length - 1}` : ""}
                      </Pill>
                    ) : (
                      <span style={{ color: "var(--dim)" }}>—</span>
                    )}
                  </td>
                  <td className="tnum" style={{ textAlign: "right", color: "var(--muted)" }}>
                    {dec(s.confidence.latest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Glass>
    </>
  );
}
