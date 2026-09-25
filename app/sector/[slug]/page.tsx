import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SECTOR_NAME, SECTORS, isSectorSlug } from "../../../scoring/sectors";
import type { SectorScore } from "../../../scoring/types";
import { ATTENTION_MAX, CorrelationChart, DataChip, EmptyState, Footer, Notices, Pill } from "../../components/score";
import SiteHeader from "../../components/SiteHeader";
import { Arrow, Cta, Glass, Hero, MeterPanel, NEG, POS, SectionHead, TargetIcon } from "../../components/ui";
import { loadSnapshot } from "../../lib/data";
import { DIRECTION_LABEL, RELATION_LABEL, ago, bare, dateLabel, dec, eventLabel, pct, pval, signed } from "../../lib/format";

export async function generateMetadata({ params }: PageProps<"/sector/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: isSectorSlug(slug) ? `${SECTOR_NAME[slug]} — Divergence` : "Sektor — Divergence" };
}

export default async function SectorPage({ params }: PageProps<"/sector/[slug]">) {
  const { slug } = await params;
  if (!isSectorSlug(slug)) notFound();
  const snapshot = await loadSnapshot();
  const s = snapshot?.sectors.find((x) => x.slug === slug);

  return (
    <>
      <div className="ds-plate" aria-hidden="true" />
      <div className="ds-shell">
        <SiteHeader current="sector" sectorHref={`/sector/${slug}`} />
        <main>
          <nav className="dv-switch" aria-label="Pindah sektor">
            <Cta variant="back" href="/">
              Peringkat
            </Cta>
            {SECTORS.map((x) => (
              <Link key={x.slug} href={`/sector/${x.slug}`} aria-current={x.slug === slug ? "page" : undefined}>
                {x.name}
              </Link>
            ))}
          </nav>
          {snapshot && s ? (
            <Detail s={s} snapshot={snapshot} />
          ) : (
            <EmptyState />
          )}
        </main>
        <Footer snapshot={snapshot} />
      </div>
    </>
  );
}

function Detail({ s, snapshot }: { s: SectorScore; snapshot: NonNullable<Awaited<ReturnType<typeof loadSnapshot>>> }) {
  const sens = s.sensitivity;
  const factors = [
    { k: "Eksposur", v: dec(s.exposure.score, 3) },
    { k: "0,5 + Sensitivitas", v: dec(0.5 + sens.score, 3) },
    { k: "1 + Flow + Pemicu", v: dec(1 + s.flow.intensity + s.trigger.intensity, 3) },
  ];

  return (
    <>
      <Hero
        eyebrow={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Peringkat {s.rank} dari 11 · {dateLabel(snapshot.date)}
            <DataChip snapshot={snapshot} />
          </span>
        }
        title={s.name}
        tag={
          <>
            {factors.map((f, i) => (
              <span key={f.k}>
                {i ? " × " : ""}
                <b className="tnum">{f.v}</b> <span style={{ color: "var(--muted)" }}>({f.k})</span>
              </span>
            ))}{" "}
            = <b className="tnum">{dec(s.attention, 3)}</b>
          </>
        }
        aside={
          <MeterPanel
            title="Skor perhatian"
            icon={<TargetIcon />}
            big={dec(s.attention)}
            sub={<>dari maksimum 4,5 — hanya tinggi bila ketiga syarat terpenuhi.</>}
            scale={["0", "1,5", "3", "4,5"]}
            fill={s.attention / ATTENTION_MAX}
            label={`Skor perhatian ${dec(s.attention)} dari 4,5`}
          />
        }
      />

      <Notices snapshot={snapshot} />

      <div className="ds-grid ds-split" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <Glass delay={200}>
          <SectionHead
            title={<>1 · Eksposur <span className="dv-score">{pct(s.exposure.score, 1)}</span></>}
            note="Porsi kapitalisasi sektor yang terhubung ke entitas SGX, dikali bobot jenis hubungan. Tiap emiten dihitung sekali, pada hubungan terkuatnya."
          />
          {s.exposure.links.length ? (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>SGX → IDX</th>
                    <th style={{ textAlign: "left" }}>Hubungan</th>
                    <th style={{ textAlign: "right" }}>
                      Bobot<small>× porsi kap.</small>
                    </th>
                    <th style={{ textAlign: "right" }}>Kontribusi</th>
                  </tr>
                </thead>
                <tbody>
                  {s.exposure.links.map((l) => (
                    <tr key={`${l.sgxEntity}-${l.idxSymbol}`} title={l.source}>
                      <td>
                        <b style={{ fontWeight: 560 }}>{bare(l.sgxEntity)}</b> → {l.idxSymbol ? bare(l.idxSymbol) : <i>operasi di Indonesia</i>}
                        {l.via && <div className="dv-dim">lewat {bare(l.via)}</div>}
                        {!l.verified && <div className="dv-dim">belum diverifikasi</div>}
                      </td>
                      <td style={{ color: "var(--muted2)" }}>{RELATION_LABEL[l.relation]}</td>
                      <td className="tnum" style={{ textAlign: "right" }}>
                        {dec(l.weight, 1)} × {pct(l.capShare, 1)}
                      </td>
                      <td className="tnum" style={{ textAlign: "right", fontWeight: 520 }}>
                        {l.contribution ? pct(l.contribution, 1) : <span style={{ color: "var(--dim)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ds-note">Tidak ada hubungan SGX yang terkurasi untuk sektor ini — skor perhatian otomatis 0.</p>
          )}
        </Glass>

        <Glass delay={240}>
          <SectionHead
            title={<>2 · Sensitivitas <span className="dv-score">{dec(sens.score, 3)}</span></>}
            note={`Regresi return sektor IDX pada return ${sens.sgxSeries === "sti" ? "indeks STI" : "keranjang SGX terkait"} sesi sebelumnya, jendela ${snapshot.validation.window} hari. Nol bila tidak signifikan setelah koreksi.`}
          />
          <div className="ds-kv"><span>β (SG → ID)</span><span>{dec(sens.beta, 3)}</span></div>
          <div className="ds-kv"><span>p / p terkoreksi BH</span><span>{pval(sens.pValue)} / {pval(sens.pAdjusted)}</span></div>
          <div className="ds-kv"><span>Stabilitas tanda β</span><span>{pct(sens.stability)} dari {sens.windows} jendela</span></div>
          <div className="ds-kv"><span>R² · n</span><span>{dec(sens.r2, 3)} · {sens.n}</span></div>
          <div className="ds-kv"><span>Variabel kontrol</span><span>{sens.controls.length ? sens.controls.join(", ") : "belum tersedia"}</span></div>
          <div className="ds-kv">
            <span>Arah balik (ID → SG)</span>
            <span>
              β {dec(sens.reverse.beta, 3)} · p {pval(sens.reverse.pAdjusted)}
            </span>
          </div>
          <p style={{ marginTop: 14 }}>
            {sens.significant ? <Pill tone="ok">Signifikan setelah koreksi</Pill> : <Pill tone="plain">Belum terbukti di data harga</Pill>}
          </p>
        </Glass>

        <Glass delay={280}>
          <SectionHead
            title={<>3 · Flow <span className="dv-score">{dec(s.flow.intensity, 3)}</span></>}
            note="Transaksi orang dalam dan institusi di emiten sektor ini, 30 hari, meluruh setengah tiap 7 hari. Private placement dan repo diberi bobot kecil. Arah jual atau beli sama-sama menambah perhatian."
          />
          <div className="ds-kv">
            <span>Skor bersih</span>
            <span style={{ color: s.flow.score ? (s.flow.score > 0 ? POS : NEG) : undefined }}>
              <Arrow v={s.flow.score} />
              {signed(s.flow.score, 1)}
            </span>
          </div>
          <div className="ds-kv"><span>Transaksi · beli · jual</span><span>{s.flow.count} · {s.flow.buys} · {s.flow.sells}</span></div>
          <div className="ds-kv"><span>Pendanaan (placement / repo)</span><span>{s.flow.financing}</span></div>
          <div className="ds-kv">
            <span>Pemegang terkait SGX</span>
            <span>{s.flow.linkedHolders.length ? s.flow.linkedHolders.map(bare).join(", ") : "—"}</span>
          </div>
        </Glass>

        <Glass delay={320}>
          <SectionHead
            title={<>4 · Pemicu <span className="dv-score">{dec(s.trigger.intensity, 3)}</span></>}
            note="Berita Singapura 3 hari terakhir, diklasifikasi dengan pola regex — tanpa model. Judul berbobot 2× isi; kalimat yang dinegasikan diabaikan."
          />
          {s.trigger.events.length ? (
            <ul className="dv-events">
              {s.trigger.events.map((e) => (
                <li key={`${e.newsId}-${e.type}`}>
                  <Pill tone={e.direction < 0 ? "bad" : e.direction > 0 ? "ok" : "plain"}>{eventLabel(e.type)}</Pill>
                  <span>
                    <b style={{ fontWeight: 560 }}>{bare(e.entity)}</b> · {DIRECTION_LABEL[e.direction]} · di {e.where === "headline" ? "judul" : "isi"} ·
                    bobot {dec(e.weight)}
                  </span>
                  <span className="dv-dim">
                    {ago(e.publishedAt)}
                    {e.url && (
                      <>
                        {" · "}
                        <a href={e.url} target="_blank" rel="noopener noreferrer">
                          sumber
                        </a>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ds-note">Tidak ada pemicu dari berita SGX yang terkait dalam 3 hari terakhir.</p>
          )}
        </Glass>
      </div>

      <Glass delay={360}>
        <SectionHead
          title={<>Keyakinan <span className="dv-score">{dec(s.confidence.latest)}</span></>}
          note="Korelasi bergulir 60 hari antara sektor IDX dan seri SGX sesi sebelumnya. Ditampilkan terpisah dan tidak pernah dikalikan ke skor: ia menunjukkan seberapa terlihat keterkaitan itu di harga akhir-akhir ini."
        />
        <CorrelationChart series={s.confidence.series} />
      </Glass>
    </>
  );
}
