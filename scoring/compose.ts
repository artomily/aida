/**
 * Final attention score. Multiplicative, so a sector needs all three conditions to rank high:
 * structurally connected (Base), historically responsive (Sensitivity), and a trigger today
 * (Flow / Trigger). A weighted sum would let one loud component carry a sector with no real
 * linkage.
 *
 *   Attention = Base × (0.5 + Sensitivity) × (1 + Flow + Trigger)
 *
 * Confidence is carried alongside and never multiplied in.
 */
import { SECTOR_NAME, SECTORS, type SectorSlug } from "./sectors";
import type { ConfidenceResult, ExposureResult, FlowResult, SectorScore, SensitivityResult, TriggerResult } from "./types";

export const attention = (base: number, sensitivity: number, flow: number, trigger: number) =>
  base * (0.5 + sensitivity) * (1 + flow + trigger);

export function compose(parts: {
  exposure: Map<SectorSlug, ExposureResult>;
  sensitivity: Map<SectorSlug, SensitivityResult>;
  flow: Map<SectorSlug, FlowResult>;
  trigger: Map<SectorSlug, TriggerResult>;
  confidence: Map<SectorSlug, ConfidenceResult>;
}): SectorScore[] {
  const rows = SECTORS.map(({ slug }) => {
    const exposure = parts.exposure.get(slug)!;
    const sensitivity = parts.sensitivity.get(slug)!;
    const flow = parts.flow.get(slug)!;
    const trigger = parts.trigger.get(slug)!;
    return {
      slug,
      name: SECTOR_NAME[slug],
      rank: 0,
      attention: attention(exposure.score, sensitivity.score, flow.intensity, trigger.intensity),
      exposure,
      sensitivity,
      flow,
      trigger,
      confidence: parts.confidence.get(slug) ?? { latest: null, series: [] },
    };
  });
  rows.sort((a, b) => b.attention - a.attention || b.exposure.score - a.exposure.score);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
