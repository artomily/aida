/**
 * Shapes shared by ingest, scoring, storage and the dashboard. Scoring modules take these in
 * and return numbers out — no I/O anywhere under `scoring/`.
 */
import type { SectorSlug } from "./sectors";

export type Market = "IDX" | "SGX";

/* ── curated inputs (data/*.yaml) ── */

export type RelationType =
  | "parent"
  | "significant_shareholder"
  | "sgx_listed_id_operations"
  | "commodity_trade"
  | "board_overlap";

export type Relationship = {
  /** Always suffixed: `C07.SI`. */
  sgxEntity: string;
  /** IDX emiten the link runs through, when there is one: `ASII.JK`. */
  idxSymbol: string | null;
  sector: SectorSlug;
  relation: RelationType;
  /** Intermediate holder for indirect links (documentation only). */
  via: string | null;
  stake: number | null;
  source: string;
  verified: boolean;
};

export type ExposureGraph = {
  relationWeights: Record<RelationType, number>;
  /** Approximate SGD→IDR rate; only scales SGX-only rows against IDX sector market caps. */
  sgdIdr: number;
  relationships: Relationship[];
};

/** Ticker → name variants. */
export type EntityAliases = Record<string, string[]>;

export type EventType = string;

export type EventRule = {
  /** +1 supportive, −1 adverse, 0 ambiguous. */
  direction: -1 | 0 | 1;
  materiality: number;
  patterns: string[];
};

export type EventTaxonomy = {
  negationWindow: number;
  headlineWeight: number;
  negations: string[];
  events: Record<EventType, EventRule>;
};

/* ── ingested rows ── */

export type Company = {
  symbol: string;
  name: string;
  market: Market;
  /** Scored sector, or null when the provider label maps to none (e.g. Listed Investment Product). */
  sector: SectorSlug | null;
  /** In listing currency (IDR / SGD). */
  marketCap: number | null;
};

export type PriceRow = { date: string; symbol: string; market: Market; close: number };

export type ControlRow = { date: string; series: ControlSeries; value: number };

export type ControlSeries = "spx_fut" | "usdidr" | "hsi" | "coal" | "cpo";

export type NewsItem = {
  id: string;
  publishedAt: string;
  title: string;
  body: string;
  /** Suffixed tickers the provider tagged. */
  symbols: string[];
  url: string | null;
};

export type OwnershipTx = {
  id: string;
  date: string;
  symbol: string;
  sector: SectorSlug | null;
  holderName: string;
  holderType: string | null;
  txType: "buy" | "sell" | "others";
  value: number | null;
  pctChange: number | null;
  /** Provider tags plus title words — scanned for placement / repurchase-agreement mechanics. */
  tags: string[];
};

/* ── component outputs ── */

export type ExposureLink = {
  sgxEntity: string;
  idxSymbol: string | null;
  relation: RelationType;
  weight: number;
  /** Market cap of the linked company as a share of the IDX sector's market cap. */
  capShare: number | null;
  contribution: number;
  via: string | null;
  source: string;
  verified: boolean;
};

export type ExposureResult = { score: number; links: ExposureLink[] };

export type RegressionResult = {
  beta: number;
  se: number;
  t: number;
  pValue: number;
  r2: number;
  n: number;
};

export type SensitivityResult = {
  /** Lagged-SGX coefficient on the latest window; null when history is too short. */
  beta: number | null;
  pValue: number | null;
  pAdjusted: number | null;
  stability: number | null;
  r2: number | null;
  n: number;
  windows: number;
  significant: boolean;
  /** beta × stability when significant after correction, else 0. */
  score: number;
  /** Which SGX series stood in for this sector. */
  sgxSeries: "linked-basket" | "sti";
  controls: ControlSeries[];
  /** ID → SG: SGX basket on lagged IDX sector return. */
  reverse: { beta: number | null; pValue: number | null; pAdjusted: number | null; significant: boolean };
};

export type FlowResult = {
  /** Signed: positive = net insider / institutional buying. */
  score: number;
  /** 0–1, direction-free; this is what enters the attention score. */
  intensity: number;
  count: number;
  buys: number;
  sells: number;
  /** Placement / repurchase-agreement rows, counted but down-weighted. */
  financing: number;
  /** SGX-linked holders seen transacting in this sector (from entity aliases). */
  linkedHolders: string[];
};

export type TriggerEvent = {
  newsId: string;
  type: EventType;
  entity: string;
  direction: -1 | 0 | 1;
  materiality: number;
  where: "headline" | "body";
  weight: number;
  publishedAt: string;
  url: string | null;
};

export type TriggerResult = {
  score: number;
  intensity: number;
  events: TriggerEvent[];
};

export type ConfidenceResult = {
  latest: number | null;
  /** Rolling 60-day correlation, one point per day, oldest first. */
  series: { date: string; value: number }[];
};

export type SectorScore = {
  slug: SectorSlug;
  name: string;
  rank: number;
  attention: number;
  exposure: ExposureResult;
  sensitivity: SensitivityResult;
  flow: FlowResult;
  trigger: TriggerResult;
  confidence: ConfidenceResult;
};

export type SnapshotMode = "live" | "mock";

/**
 * One row of `daily_snapshot`: everything the dashboard shows for a day. Derived values only —
 * no raw price or news text leaves the pipeline.
 */
export type Snapshot = {
  date: string;
  generatedAt: string;
  mode: SnapshotMode;
  sectors: SectorScore[];
  brief: { text: string; by: "llm" | "template"; model?: string };
  validation: {
    /** Sectors whose lagged-SGX beta survives Benjamini–Hochberg at alpha. */
    significant: number;
    reverseSignificant: number;
    alpha: number;
    window: number;
    history: { from: string | null; to: string | null; days: number };
    controlsUsed: ControlSeries[];
    controlsMissing: ControlSeries[];
    /** SGX entities seen as `holder_name` in IDX filings — the exposure-graph cross-check. */
    ownershipMatches: { sgxEntity: string; holderName: string; symbol: string; date: string }[];
  };
  notes: string[];
};
