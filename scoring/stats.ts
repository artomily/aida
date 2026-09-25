/**
 * Small, dependency-free statistics: OLS with t-test p-values, Benjamini–Hochberg, Pearson
 * correlation. Enough for 5-regressor daily-return models; not a general linear-algebra kit.
 */
import type { RegressionResult } from "./types";

/* ── special functions (Numerical Recipes) ── */

function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const MAX = 300;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a, b). */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? (bt * betaContinuedFraction(a, b, x)) / a
    : 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Two-sided p-value of a t statistic with `df` degrees of freedom. */
export function tTestPValue(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return 1;
  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

/* ── OLS ── */

/** Solve A·x = b for symmetric positive-definite A (Gauss–Jordan with partial pivoting); returns A⁻¹ too. */
function invert(a: number[][]): number[][] | null {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-14) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const p = m[col][col];
    for (let j = 0; j < 2 * n; j++) m[col][j] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      if (f !== 0) for (let j = 0; j < 2 * n; j++) m[r][j] -= f * m[col][j];
    }
  }
  return m.map((row) => row.slice(n));
}

/**
 * y = a + Σ bₖ·xₖ + e. Returns the fit for the regressor at `target` (index into `xs`, no
 * intercept), with classical OLS standard errors. Null when the design is singular or too short.
 */
export function ols(y: number[], xs: number[][], target = 0): RegressionResult | null {
  const n = y.length;
  const k = xs.length + 1;
  if (n <= k + 2 || xs.some((x) => x.length !== n)) return null;
  const row = (i: number) => [1, ...xs.map((x) => x[i])];

  const xtx = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const xty = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) {
    const r = row(i);
    for (let a = 0; a < k; a++) {
      xty[a] += r[a] * y[i];
      for (let b = a; b < k; b++) xtx[a][b] += r[a] * r[b];
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) xtx[a][b] = xtx[b][a];

  const inv = invert(xtx);
  if (!inv) return null;
  const coef = inv.map((r) => r.reduce((s, v, j) => s + v * xty[j], 0));

  let ssr = 0;
  let sst = 0;
  const mean = y.reduce((s, v) => s + v, 0) / n;
  for (let i = 0; i < n; i++) {
    const fit = row(i).reduce((s, v, j) => s + v * coef[j], 0);
    ssr += (y[i] - fit) ** 2;
    sst += (y[i] - mean) ** 2;
  }
  const df = n - k;
  const sigma2 = ssr / df;
  const j = target + 1;
  const se = Math.sqrt(sigma2 * inv[j][j]);
  const beta = coef[j];
  const t = se > 0 ? beta / se : 0;
  return { beta, se, t, pValue: tTestPValue(t, df), r2: sst > 0 ? 1 - ssr / sst : 0, n };
}

/* ── multiple testing ── */

/** Benjamini–Hochberg adjusted p-values, in input order. Nulls stay null and are not counted. */
export function benjaminiHochberg(pValues: (number | null)[]): (number | null)[] {
  const idx = pValues.map((p, i) => ({ p, i })).filter((x): x is { p: number; i: number } => x.p !== null);
  const m = idx.length;
  idx.sort((a, b) => a.p - b.p);
  const out: (number | null)[] = pValues.map(() => null);
  let running = 1;
  for (let r = m - 1; r >= 0; r--) {
    running = Math.min(running, (idx[r].p * m) / (r + 1));
    out[idx[r].i] = Math.min(1, running);
  }
  return out;
}

/* ── correlation ── */

export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : null;
}

/** Squash a non-negative magnitude onto 0–1; `scale` is the magnitude that maps to ~0.76. */
export const squash = (magnitude: number, scale: number) => Math.tanh(Math.abs(magnitude) / scale);
