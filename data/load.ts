/**
 * Read and validate the curated YAML files. Fails loudly on a typo — a silently dropped
 * relationship would change every exposure score without anyone noticing.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { isSectorSlug } from "../scoring/sectors";
import type { EntityAliases, EventTaxonomy, ExposureGraph, RelationType } from "../scoring/types";

const DIR = path.join(process.cwd(), "data");
const read = (file: string) => parse(readFileSync(path.join(DIR, file), "utf8"));

const RELATIONS: RelationType[] = [
  "parent",
  "significant_shareholder",
  "sgx_listed_id_operations",
  "commodity_trade",
  "board_overlap",
];

const ticker = (v: unknown, suffix: ".SI" | ".JK", where: string) => {
  if (typeof v !== "string" || !v.toUpperCase().endsWith(suffix)) throw new Error(`${where}: expected a ${suffix} ticker, got ${v}`);
  return v.toUpperCase();
};

export function loadExposureGraph(): ExposureGraph {
  const raw = read("exposure_graph.yaml");
  const relationWeights = raw.relation_weights as Record<RelationType, number>;
  for (const r of RELATIONS) if (typeof relationWeights?.[r] !== "number") throw new Error(`exposure_graph: missing weight for ${r}`);
  const sgdIdr = Number(raw.fx?.sgd_idr);
  if (!(sgdIdr > 0)) throw new Error("exposure_graph: fx.sgd_idr must be a positive number");

  const relationships = (raw.relationships as Record<string, unknown>[]).map((r, i) => {
    const where = `exposure_graph.relationships[${i}]`;
    if (!RELATIONS.includes(r.relation as RelationType)) throw new Error(`${where}: unknown relation ${r.relation}`);
    if (typeof r.sector !== "string" || !isSectorSlug(r.sector)) throw new Error(`${where}: unknown sector ${r.sector}`);
    return {
      sgxEntity: ticker(r.sgx_entity, ".SI", where),
      idxSymbol: r.idx_symbol == null ? null : ticker(r.idx_symbol, ".JK", where),
      sector: r.sector,
      relation: r.relation as RelationType,
      via: typeof r.via === "string" ? r.via.toUpperCase() : null,
      stake: typeof r.stake === "number" ? r.stake : null,
      source: String(r.source ?? ""),
      verified: r.verified === true,
    };
  });
  return { relationWeights, sgdIdr, relationships };
}

export function loadEntityAliases(): EntityAliases {
  const raw = read("entity_aliases.yaml") as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(raw).map(([t, names]) => {
      if (!Array.isArray(names) || !names.every((n) => typeof n === "string"))
        throw new Error(`entity_aliases: ${t} must list strings`);
      return [t.toUpperCase(), names as string[]];
    }),
  );
}

export function loadEventTaxonomy(): EventTaxonomy {
  const raw = read("event_taxonomy.yaml");
  const events = Object.fromEntries(
    Object.entries(raw.events as Record<string, { direction: number; materiality: number; patterns: string[] }>).map(
      ([type, e]) => {
        if (![-1, 0, 1].includes(e.direction)) throw new Error(`event_taxonomy.${type}: direction must be -1, 0 or 1`);
        // Compile once here so a bad pattern fails at load, not mid-scoring.
        for (const p of e.patterns) new RegExp(p, "iu");
        return [type, { direction: e.direction as -1 | 0 | 1, materiality: Number(e.materiality), patterns: e.patterns }];
      },
    ),
  );
  return {
    negationWindow: Number(raw.negation_window ?? 5),
    headlineWeight: Number(raw.headline_weight ?? 2),
    negations: raw.negations as string[],
    events,
  };
}
