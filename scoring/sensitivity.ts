/**
 * Sensitivity: per-sector regression of the IDX sector return on the lagged SGX return,
 * with global controls when they are available.
 *
 *   r_IDX(t) = a + b1·r_SGX(t−1) + b2·r_SPX_fut + b3·Δ(USDIDR) + b4·r_HSI + e
 *
 * - estimated on the latest `window` trading days
 * - p-values corrected across the 11 sectors with Benjamini–Hochberg; p_adj > alpha → score 0
 * - stability = share of all rolling windows whose b1 keeps the latest window's sign
 * - the reverse direction (ID → SG) is tested with the same machinery and reported separately
 */
import { alignLagged, type Series } from "./returns";
import { SECTORS, type SectorSlug } from "./sectors";
import { benjaminiHochberg, ols } from "./stats";
import type { ControlSeries, SensitivityResult } from "./types";

export type SensitivityConfig = {
  window: number;
  alpha: number;
  /** Rolling windows are sampled every `step` days for the stability measure. */
  step: number;
  /** A control needs this share of the sample's dates to be used at all. */
  controlCoverage: number;
};

export const DEFAULT_SENSITIVITY: SensitivityConfig = { window: 250, alpha: 0.05, step: 5, controlCoverage: 0.9 };

export type SensitivityInput = {
  idx: Map<SectorSlug, Series>;
  sgx: Map<SectorSlug, { series: Series; source: "linked-basket" | "sti" }>;
  controls: Map<ControlSeries, Series>;
};

type Fit = { beta: number; pValue: number; r2: number; n: number; stability: number | null; windows: number };

function design(y: Series, x: Series, controls: Map<ControlSeries, Series>, cfg: SensitivityConfig) {
  const lagged = alignLagged(y, x);
  // Only controls that cover nearly the whole sample; a patchy control would shrink n silently.
  const usable = [...controls].filter(
    ([, s]) => lagged.dates.filter((d) => s.has(d)).length >= cfg.controlCoverage * lagged.dates.length,
  );
  const keep = lagged.dates.map((d) => usable.every(([, s]) => s.has(d)));
  const pick = <T>(arr: T[]) => arr.filter((_, i) => keep[i]);
  const dates = pick(lagged.dates);
  return {
    dates,
    y: pick(lagged.y),
    xs: [pick(lagged.x), ...usable.map(([, s]) => dates.map((d) => s.get(d)!))],
    controls: usable.map(([name]) => name),
  };
}

function fit(y: number[], xs: number[][], cfg: SensitivityConfig): Fit | null {
  const n = y.length;
  if (n < Math.min(cfg.window, 60)) return null;
  const w = Math.min(cfg.window, n);
  const slice = (a: number[], end: number) => a.slice(end - w, end);
  const latest = ols(slice(y, n), xs.map((x) => slice(x, n)));
  if (!latest) return null;

  // Stability needs more than one window; with exactly `window` days there is nothing to compare.
  let same = 0;
  let windows = 0;
  if (n > w) {
    for (let end = w; end <= n; end += cfg.step) {
      const r = ols(slice(y, end), xs.map((x) => slice(x, end)));
      if (!r) continue;
      windows++;
      if (Math.sign(r.beta) === Math.sign(latest.beta)) same++;
    }
  }
  return {
    beta: latest.beta,
    pValue: latest.pValue,
    r2: latest.r2,
    n: latest.n,
    stability: windows >= 2 ? same / windows : null,
    windows,
  };
}

export function sensitivityBySector(
  input: SensitivityInput,
  cfg: SensitivityConfig = DEFAULT_SENSITIVITY,
): Map<SectorSlug, SensitivityResult> {
  const rows = SECTORS.map(({ slug }) => {
    const y = input.idx.get(slug) ?? new Map();
    const sgx = input.sgx.get(slug);
    const x = sgx?.series ?? new Map();
    const fwd = design(y, x, input.controls, cfg);
    // Reverse: the SGX side on the lagged IDX sector, same controls.
    const rev = design(x, y, input.controls, cfg);
    return {
      slug,
      source: sgx?.source ?? "sti",
      controls: fwd.controls,
      fwd: fit(fwd.y, fwd.xs, cfg),
      rev: fit(rev.y, rev.xs, cfg),
      n: fwd.dates.length,
    };
  });

  const adj = benjaminiHochberg(rows.map((r) => r.fwd?.pValue ?? null));
  const revAdj = benjaminiHochberg(rows.map((r) => r.rev?.pValue ?? null));

  return new Map(
    rows.map((r, i) => {
      const pAdjusted = adj[i];
      const significant = pAdjusted !== null && pAdjusted <= cfg.alpha && r.fwd?.stability != null;
      const score = significant ? Math.min(1, Math.abs(r.fwd!.beta)) * r.fwd!.stability! : 0;
      const result: SensitivityResult = {
        beta: r.fwd?.beta ?? null,
        pValue: r.fwd?.pValue ?? null,
        pAdjusted,
        stability: r.fwd?.stability ?? null,
        r2: r.fwd?.r2 ?? null,
        n: r.n,
        windows: r.fwd?.windows ?? 0,
        significant,
        score,
        sgxSeries: r.source,
        controls: r.controls,
        reverse: {
          beta: r.rev?.beta ?? null,
          pValue: r.rev?.pValue ?? null,
          pAdjusted: revAdj[i],
          significant: revAdj[i] !== null && revAdj[i]! <= cfg.alpha,
        },
      };
      return [r.slug, result];
    }),
  );
}
