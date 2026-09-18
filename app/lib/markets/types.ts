/**
 * Cross-exchange shapes the UI reads. Providers (sectors.app, sample) map into these;
 * components never see a provider's raw response.
 */

export type Exchange = "IDX" | "SGX";

/** One of the 11 shared sector slugs — same keys as the IDX board (`SECTORS[].slug`). */
export type SectorSlug =
  | "financials"
  | "energy"
  | "basic-materials"
  | "industrials"
  | "consumer-cyclicals"
  | "consumer-non-cyclicals"
  | "healthcare"
  | "technology"
  | "infrastructure"
  | "properties"
  | "transportation";

export type Stock = {
  /** Always suffixed: `BBCA.JK`, `D05.SI`. */
  symbol: string;
  name: string;
  exchange: Exchange;
  sector: SectorSlug;
  /** Provider's own sub-sector label, kept for display. */
  subSector: string | null;
  /** In the listing currency (IDR / SGD). */
  marketCap: number | null;
  price: number | null;
  /** Day-over-day close change as a decimal (0.012 = +1,2%). */
  change: number | null;
};

export type Sentiment = "bullish" | "bearish" | "neutral";

export type NewsItem = {
  id: string;
  exchange: Exchange;
  title: string;
  summary: string;
  url: string | null;
  /** ISO timestamp. */
  timestamp: string;
  symbols: string[];
  sector: SectorSlug | null;
  tags: string[];
  sentiment: Sentiment;
  /** Tagged with a governance / legal / distress signal — feeds the domino alert. */
  risk: boolean;
};

export type LinkRelation =
  | "pengendali" // SGX entity controls the IDX emiten (or vice versa)
  | "anak-usaha" // direct subsidiary
  | "pemegang-saham" // significant but non-controlling stake
  | "grup" // same conglomerate / controlling family
  | "sponsor"; // REIT sponsor

export type CrossLink = {
  id: string;
  /** Edge direction is the direction a shock travels: from → to. */
  from: string;
  to: string;
  relation: LinkRelation;
  /** Ownership share 0–1 when known. */
  stake: number | null;
  /** Human-readable basis for the link. */
  basis: string;
  /** "kurasi" = hand-maintained seed; "otomatis" = detected from the ownership report. */
  origin: "kurasi" | "otomatis";
};

export type DataSource = {
  provider: "sectors.app" | "contoh";
  /** ISO time the data was assembled on the server. */
  fetchedAt: string;
  note?: string;
};

export type MarketOverview = {
  source: DataSource;
  idx: Stock[];
  sgx: Stock[];
};

export type LinkSensitivity = {
  linkId: string;
  /** How far `to` moves per 1% move in `from`, from daily returns. */
  beta: number;
  correlation: number;
  /** Sample size in trading days; 0 when estimated from the stake alone. */
  days: number;
};

export type LinksPayload = {
  source: DataSource;
  links: CrossLink[];
  sensitivity: LinkSensitivity[];
  /** Company names for every symbol that appears in `links`. */
  names: Record<string, string>;
  /**
   * Key executives / commissioners per IDX emiten in the graph. Matched against news from the
   * other exchange so a board member named in SGX news surfaces on the linked IDX card.
   */
  people: Record<string, { name: string; position: string }[]>;
};
