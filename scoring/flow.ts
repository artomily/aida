/**
 * Flow: insider / institutional net activity per sector, from IDX ownership filings. Fully
 * deterministic, no model.
 *
 *   signal = +1 buy, −1 sell (others → 0)
 *   score  = signal × log1p(value) × holder_weight × time_decay
 *
 * Placement and repurchase-agreement rows are financing mechanics, not conviction, and are
 * down-weighted. Attention uses the direction-free intensity (heavy selling deserves a look as
 * much as heavy buying); the signed score is kept for display.
 */
import { daysBetween } from "./returns";
import { SECTORS, type SectorSlug } from "./sectors";
import { squash } from "./stats";
import type { EntityAliases, FlowResult, OwnershipTx } from "./types";
import { aliasMatcher } from "./trigger";

export type FlowConfig = {
  lookbackDays: number;
  halfLifeDays: number;
  holderWeights: Record<string, number>;
  financingWeight: number;
  /** |Σ score| that maps to intensity ≈ 0.76. One Rp1bn trade ≈ log1p(1e9) ≈ 20.7. */
  scale: number;
};

export const DEFAULT_FLOW: FlowConfig = {
  lookbackDays: 30,
  halfLifeDays: 7,
  holderWeights: { insider: 1, "corporate-investor": 0.8, institution: 0.6 },
  financingWeight: 0.25,
  scale: 60,
};

const FINANCING = /placement|repurchase|repo\b|gadai|pledge/i;

export const isFinancing = (tx: OwnershipTx) => tx.tags.some((t) => FINANCING.test(t));

export function txScore(tx: OwnershipTx, asOf: string, cfg: FlowConfig = DEFAULT_FLOW): number {
  const signal = tx.txType === "buy" ? 1 : tx.txType === "sell" ? -1 : 0;
  const age = daysBetween(tx.date.slice(0, 10), asOf);
  if (!signal || age < 0 || age > cfg.lookbackDays) return 0;
  const decay = Math.pow(0.5, age / cfg.halfLifeDays);
  const holder = cfg.holderWeights[tx.holderType ?? ""] ?? 0.5;
  const financing = isFinancing(tx) ? cfg.financingWeight : 1;
  return signal * Math.log1p(Math.max(0, tx.value ?? 0)) * holder * decay * financing;
}

export function flowBySector(
  txs: OwnershipTx[],
  asOf: string,
  aliases: EntityAliases,
  cfg: FlowConfig = DEFAULT_FLOW,
): Map<SectorSlug, FlowResult> {
  const out = new Map<SectorSlug, FlowResult>(
    SECTORS.map((s) => [s.slug, { score: 0, intensity: 0, count: 0, buys: 0, sells: 0, financing: 0, linkedHolders: [] }]),
  );
  const match = aliasMatcher(aliases, (ticker) => ticker.endsWith(".SI"));
  for (const tx of txs) {
    if (!tx.sector) continue;
    const s = txScore(tx, asOf, cfg);
    if (s === 0) continue;
    const r = out.get(tx.sector)!;
    r.score += s;
    r.count++;
    if (s > 0) r.buys++;
    else r.sells++;
    if (isFinancing(tx)) r.financing++;
    for (const ticker of match(tx.holderName)) if (!r.linkedHolders.includes(ticker)) r.linkedHolders.push(ticker);
  }
  for (const r of out.values()) r.intensity = squash(r.score, cfg.scale);
  return out;
}

/** SGX entities appearing as `holder_name` in IDX filings — evidence for the exposure graph. */
export function ownershipCrossCheck(txs: OwnershipTx[], aliases: EntityAliases) {
  const match = aliasMatcher(aliases, (ticker) => ticker.endsWith(".SI"));
  const seen = new Set<string>();
  const out: { sgxEntity: string; holderName: string; symbol: string; date: string }[] = [];
  for (const tx of txs)
    for (const sgxEntity of match(tx.holderName)) {
      const key = `${sgxEntity}|${tx.symbol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ sgxEntity, holderName: tx.holderName, symbol: tx.symbol, date: tx.date.slice(0, 10) });
    }
  return out;
}
