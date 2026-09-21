"use client";

import { useState } from "react";
import { SECTOR_NAME } from "../../lib/markets/sectors";
import type { DataSource, Exchange, NewsItem, SectorSlug } from "../../lib/markets/types";
import { POLL_MS, bare, timeAgo, usePolling } from "./useMarkets";

type People = Record<string, { name: string; position: string }[]>;

/** Which linked IDX board members a piece of news names, if any. */
export function boardMentions(n: NewsItem, people: People) {
  const text = `${n.title} ${n.summary}`.toLowerCase();
  const hits: { symbol: string; name: string; position: string }[] = [];
  for (const [symbol, list] of Object.entries(people))
    for (const p of list) if (p.name.length > 6 && text.includes(p.name.toLowerCase())) hits.push({ symbol, ...p });
  return hits;
}

const SENTIMENT = {
  bullish: { label: "Positif", color: "var(--pos)" },
  bearish: { label: "Negatif", color: "var(--neg)" },
  neutral: { label: "Netral", color: "var(--muted)" },
} as const;

export function NewsList({ items, people = {}, empty }: { items: NewsItem[]; people?: People; empty: string }) {
  if (!items.length) return <p className="ds-note">{empty}</p>;
  return (
    <ul className="mk-news">
      {items.map((n) => {
        const mentions = boardMentions(n, people);
        return (
          <li key={n.id} data-risk={n.risk || undefined}>
            <div className="mk-news-meta">
              <span className={`mk-ex mk-ex--${n.exchange.toLowerCase()}`}>{n.exchange}</span>
              <time dateTime={n.timestamp} title={new Date(n.timestamp).toLocaleString("id-ID")}>
                {timeAgo(n.timestamp)}
              </time>
              {n.sentiment !== "neutral" && (
                <span style={{ color: SENTIMENT[n.sentiment].color }}>● {SENTIMENT[n.sentiment].label}</span>
              )}
              {n.risk && <span className="mk-flag">Tanda risiko</span>}
            </div>
            {n.url ? (
              <a className="mk-news-title" href={n.url} target="_blank" rel="noopener noreferrer">
                {n.title}
              </a>
            ) : (
              <span className="mk-news-title">{n.title}</span>
            )}
            {n.summary && <p className="mk-news-body">{n.summary}</p>}
            {(n.symbols.length > 0 || mentions.length > 0) && (
              <div className="mk-news-tags">
                {n.symbols.slice(0, 6).map((s) => (
                  <span key={s} className="mk-chip">
                    {bare(s)}
                  </span>
                ))}
                {mentions.map((m) => (
                  <span key={m.symbol + m.name} className="mk-chip mk-chip--warn">
                    Menyebut {m.name} ({m.position}, {bare(m.symbol)})
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Live news for one shared sector, both exchanges, refreshed every minute. */
export default function SectorNews({
  sector,
  symbols = [],
  people = {},
}: {
  sector: SectorSlug;
  symbols?: string[];
  people?: People;
}) {
  const [ex, setEx] = useState<Exchange | "ALL">("ALL");
  const url = `/api/markets/news?sector=${sector}${symbols.length ? `&symbols=${symbols.join(",")}` : ""}`;
  const { data, error, at } = usePolling<{ source: DataSource; news: NewsItem[] }>(url, POLL_MS);
  const items = (data?.news ?? []).filter((n) => ex === "ALL" || n.exchange === ex).slice(0, 12);

  return (
    <div>
      <div className="mk-news-head">
        <div>
          <h3 className="ds-h2" style={{ fontSize: 18 }}>
            Berita {SECTOR_NAME[sector]}
          </h3>
          <p className="ds-note" style={{ margin: "4px 0 0" }}>
            <span className="mk-live" aria-hidden="true" />
            {at ? `Diperbarui ${new Date(at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · otomatis tiap jam` : "Memuat…"}
          </p>
        </div>
        <div className="mk-seg" role="group" aria-label="Filter bursa">
          {(["ALL", "SGX", "IDX"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={ex === k} onClick={() => setEx(k)}>
              {k === "ALL" ? "Semua" : k}
            </button>
          ))}
        </div>
      </div>
      {error && !data ? (
        <p className="ds-note">Berita belum bisa dimuat ({error}).</p>
      ) : (
        <NewsList
          items={items}
          people={people}
          empty={data ? "Belum ada berita untuk sektor ini dalam feed terbaru." : "Memuat berita…"}
        />
      )}
    </div>
  );
}
