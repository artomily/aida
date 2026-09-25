/**
 * Confidence: rolling 60-day correlation between the IDX sector return and the lagged SGX
 * series. Shown next to the score, never folded into it — it says how much the linkage has
 * been visible in prices lately, not whether today's trigger matters.
 */
import { alignLagged, type Series } from "./returns";
import { pearson } from "./stats";
import type { ConfidenceResult } from "./types";

export function confidence(idx: Series, sgx: Series, window = 60, points = 60): ConfidenceResult {
  const a = alignLagged(idx, sgx);
  const series: ConfidenceResult["series"] = [];
  for (let end = Math.max(window, a.y.length - points + 1); end <= a.y.length; end++) {
    const v = pearson(a.y.slice(end - window, end), a.x.slice(end - window, end));
    if (v !== null) series.push({ date: a.dates[end - 1], value: v });
  }
  return { latest: series.at(-1)?.value ?? null, series };
}
