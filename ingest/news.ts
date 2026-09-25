/**
 * Singapore financial news for the linked SGX entities. Raw text is stored for internal
 * classification only; the public snapshot carries event types, entities and source links.
 */
import type { NewsItem } from "../scoring/types";
import { HOURLY, allPages } from "./client";

type SgxNewsRow = {
  title: string;
  body?: string | null;
  source?: string | null;
  timestamp: string;
  symbols?: string[] | null;
};

const suffix = (s: string) => (s.toUpperCase().endsWith(".SI") ? s.toUpperCase() : s.toUpperCase() + ".SI");

/** News for `symbols` (SGX tickers) published on or after `start`. 1 credit per page of 30. */
export async function fetchSgxNews(symbols: string[], start: string, maxPages = 10): Promise<NewsItem[]> {
  const rows = await allPages<SgxNewsRow>(
    "/sgx/news/",
    { symbols: symbols.map((s) => s.replace(/\.SI$/i, "")).join(","), start },
    30,
    HOURLY,
    maxPages,
  );
  return rows.map((r) => ({
    // The provider has no stable id; source URL (else timestamp + title) identifies an article.
    id: r.source ?? `${r.timestamp}|${r.title.slice(0, 80)}`,
    publishedAt: r.timestamp,
    title: r.title.trim(),
    body: (r.body ?? "").trim(),
    symbols: (r.symbols ?? []).map(suffix),
    url: r.source ?? null,
  }));
}
