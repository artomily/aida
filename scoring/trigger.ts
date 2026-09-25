/**
 * Trigger: rule-based event taxonomy over Singapore financial news. No model in the scoring
 * path — classification is regex over `data/event_taxonomy.yaml`, so every score is
 * deterministic, free to backtest across the whole archive, and auditable line by line.
 *
 * - a match is dropped when one of the `negationWindow` tokens before it is a negation
 * - headline matches weigh `headlineWeight` × body matches
 * - mentions resolve to tickers via `data/entity_aliases.yaml` (plus the provider's own
 *   symbol tags), then to IDX sectors via the exposure graph
 */
import { SECTORS, type SectorSlug } from "./sectors";
import { squash } from "./stats";
import type { EntityAliases, EventTaxonomy, ExposureGraph, NewsItem, TriggerEvent, TriggerResult } from "./types";

export type TriggerConfig = {
  lookbackDays: number;
  halfLifeDays: number;
  /** Σ|event weight| that maps to intensity ≈ 0.76. One fresh headline profit warning on a parent = 2. */
  scale: number;
};

export const DEFAULT_TRIGGER: TriggerConfig = { lookbackDays: 3, halfLifeDays: 1, scale: 2 };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive alias lookup → tickers mentioned in `text`. */
export function aliasMatcher(aliases: EntityAliases, keep: (ticker: string) => boolean = () => true) {
  const rules = Object.entries(aliases)
    .filter(([ticker]) => keep(ticker))
    .map(([ticker, names]) => ({
      ticker,
      re: new RegExp(`(^|[^\\p{L}\\p{N}])(${names.map(escape).join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu"),
    }));
  return (text: string) => rules.filter((r) => r.re.test(text)).map((r) => r.ticker);
}

type CompiledRule = { type: string; direction: -1 | 0 | 1; materiality: number; res: RegExp[] };

export function compileTaxonomy(tax: EventTaxonomy) {
  const rules: CompiledRule[] = Object.entries(tax.events).map(([type, r]) => ({
    type,
    direction: r.direction,
    materiality: r.materiality,
    res: r.patterns.map((p) => new RegExp(`\\b(?:${p})`, "giu")),
  }));
  const negations = tax.negations.map((n) => new RegExp(`(^|\\s)${escape(n.toLowerCase())}(\\s|$)`, "u"));

  const negated = (text: string, index: number) => {
    const before = text.slice(0, index).toLowerCase().split(/\s+/).filter(Boolean).slice(-tax.negationWindow).join(" ");
    return negations.some((re) => re.test(before));
  };

  /** Event types found in one text, each with its first non-negated match. */
  const scan = (text: string) => {
    const hits = new Set<CompiledRule>();
    for (const rule of rules)
      for (const re of rule.res) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        let found = false;
        while ((m = re.exec(text))) {
          if (!negated(text, m.index)) {
            found = true;
            break;
          }
          if (m[0].length === 0) re.lastIndex++;
        }
        if (found) {
          hits.add(rule);
          break;
        }
      }
    return hits;
  };

  /** Every event type in a news item, located in the headline when possible. */
  return (news: Pick<NewsItem, "title" | "body">) => {
    const head = scan(news.title);
    const body = scan(news.body);
    const out: { type: string; direction: -1 | 0 | 1; materiality: number; where: "headline" | "body"; weight: number }[] = [];
    for (const rule of new Set([...head, ...body])) {
      const inHead = head.has(rule);
      out.push({
        type: rule.type,
        direction: rule.direction,
        materiality: rule.materiality,
        where: inHead ? "headline" : "body",
        weight: rule.materiality * (inHead ? tax.headlineWeight : 1),
      });
    }
    return out;
  };
}

export function triggerBySector(
  news: NewsItem[],
  asOf: string,
  tax: EventTaxonomy,
  aliases: EntityAliases,
  graph: ExposureGraph,
  cfg: TriggerConfig = DEFAULT_TRIGGER,
): Map<SectorSlug, TriggerResult> {
  const classify = compileTaxonomy(tax);
  const mentions = aliasMatcher(aliases);
  const out = new Map<SectorSlug, TriggerResult>(SECTORS.map((s) => [s.slug, { score: 0, intensity: 0, events: [] }]));

  // Ticker → (sector → strongest relation weight). Both SGX entities and linked IDX emiten resolve.
  const reach = new Map<string, Map<SectorSlug, number>>();
  for (const r of graph.relationships) {
    const w = graph.relationWeights[r.relation] ?? 0;
    for (const t of [r.sgxEntity, r.idxSymbol]) {
      if (!t) continue;
      const m = reach.get(t) ?? new Map<SectorSlug, number>();
      m.set(r.sector, Math.max(m.get(r.sector) ?? 0, w));
      reach.set(t, m);
    }
  }

  // Age is measured to 06:00 WIB on the snapshot day — when users first see it — in
  // fractional days: a 5-hour-old headline should not decay like a day-old one.
  const scoredAt = Date.parse(asOf + "T06:00:00+07:00");
  for (const item of news) {
    const age = (scoredAt - Date.parse(item.publishedAt)) / 86_400_000;
    if (!(age > -1 && age <= cfg.lookbackDays)) continue;
    const events = classify(item);
    if (!events.length) continue;
    const decay = Math.pow(0.5, Math.max(0, age) / cfg.halfLifeDays);
    const entities = [...new Set([...item.symbols, ...mentions(`${item.title}\n${item.body}`)])].filter((t) => reach.has(t));

    // One news item counts once per (event type, sector), through its best-connected entity.
    const best = new Map<string, TriggerEvent & { sector: SectorSlug }>();
    for (const entity of entities)
      for (const [sector, rel] of reach.get(entity)!)
        for (const e of events) {
          const weight = e.weight * rel * decay;
          const key = `${e.type}|${sector}`;
          if ((best.get(key)?.weight ?? -1) >= weight) continue;
          best.set(key, {
            newsId: item.id,
            type: e.type,
            entity,
            direction: e.direction,
            materiality: e.materiality,
            where: e.where,
            weight,
            publishedAt: item.publishedAt,
            url: item.url,
            sector,
          });
        }

    for (const { sector, ...ev } of best.values()) {
      const r = out.get(sector)!;
      r.events.push(ev);
      r.score += ev.direction * ev.weight;
    }
  }

  for (const r of out.values()) {
    r.intensity = squash(r.events.reduce((s, e) => s + e.weight, 0), cfg.scale);
    r.events.sort((a, b) => b.weight - a.weight);
  }
  return out;
}
