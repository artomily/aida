import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attention, compose } from "./compose";
import { exposureBySector } from "./exposure";
import { DEFAULT_FLOW, flowBySector, txScore } from "./flow";
import { alignLagged, basketReturns, type Series } from "./returns";
import { SECTORS, toSectorSlug } from "./sectors";
import { sensitivityBySector } from "./sensitivity";
import { benjaminiHochberg, ols, pearson, tTestPValue } from "./stats";
import { compileTaxonomy, triggerBySector } from "./trigger";
import type { Company, EventTaxonomy, ExposureGraph, OwnershipTx } from "./types";

const near = (a: number, b: number, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

/** Deterministic N(0,1) via Box–Muller over a seeded LCG. */
function rng(seed: number) {
  let s = seed;
  const u = () => ((s = (s * 1103515245 + 12345) % 2147483648) + 1) / 2147483649;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

const weekdays = (n: number, start = "2023-01-02") => {
  const out: string[] = [];
  for (let d = new Date(start + "T00:00:00Z"); out.length < n; d = new Date(d.getTime() + 86_400_000))
    if (d.getUTCDay() % 6 !== 0) out.push(d.toISOString().slice(0, 10));
  return out;
};

const GRAPH: ExposureGraph = {
  relationWeights: { parent: 1, significant_shareholder: 0.7, sgx_listed_id_operations: 0.6, commodity_trade: 0.4, board_overlap: 0.2 },
  sgdIdr: 12500,
  relationships: [
    { sgxEntity: "C07.SI", idxSymbol: "ASII.JK", sector: "industrials", relation: "parent", via: null, stake: 0.5, source: "", verified: true },
    { sgxEntity: "J36.SI", idxSymbol: "ASII.JK", sector: "industrials", relation: "significant_shareholder", via: "C07.SI", stake: null, source: "", verified: true },
    { sgxEntity: "RE4.SI", idxSymbol: null, sector: "energy", relation: "sgx_listed_id_operations", via: null, stake: null, source: "", verified: true },
  ],
};

describe("stats", () => {
  it("t-test p-value matches tables", () => {
    near(tTestPValue(2.0, 100), 0.0482, 5e-4);
    near(tTestPValue(1.96, 1e6), 0.05, 5e-4);
    near(tTestPValue(0, 30), 1);
  });

  it("OLS recovers a known slope and flags it", () => {
    const n = rng(1);
    const x = Array.from({ length: 300 }, n);
    const y = x.map((v) => 0.1 + 0.5 * v + 0.2 * n());
    const r = ols(y, [x])!;
    near(r.beta, 0.5, 0.03);
    assert.ok(r.pValue < 1e-10);
  });

  it("Benjamini–Hochberg matches the textbook example", () => {
    assert.deepEqual(
      benjaminiHochberg([0.01, 0.04, 0.03, 0.005, null]).map((p) => (p === null ? null : +p.toFixed(4))),
      [0.02, 0.04, 0.04, 0.02, null],
    );
  });

  it("pearson", () => {
    near(pearson([1, 2, 3, 4], [2, 4, 6, 8])!, 1);
    assert.equal(pearson([1, 1, 1], [1, 2, 3]), null);
  });
});

describe("returns", () => {
  it("lags by the other market's previous session, not by index", () => {
    const y: Series = new Map([["2024-01-03", 1], ["2024-01-04", 2], ["2024-01-05", 3]]);
    // SGX closed on 01-03: the 01-04 IDX session pairs with SGX 01-02.
    const x: Series = new Map([["2024-01-02", 10], ["2024-01-04", 30]]);
    assert.deepEqual(alignLagged(y, x), { dates: ["2024-01-03", "2024-01-04", "2024-01-05"], y: [1, 2, 3], x: [10, 10, 30] });
  });

  it("basket skips days where too little weight traded", () => {
    const r = new Map([
      ["A", new Map([["d1", 0.1], ["d2", 0.2]])],
      ["B", new Map([["d1", 0.3]])],
    ]);
    const s = basketReturns(r, new Map([["A", 1], ["B", 3]]));
    near(s.get("d1")!, 0.25);
    assert.equal(s.has("d2"), false);
  });
});

describe("sectors", () => {
  it("maps provider labels and excludes Listed Investment Product", () => {
    assert.equal(toSectorSlug("Transportation & Logistic"), "transportation");
    assert.equal(toSectorSlug("Consumer Non-Cyclicals"), "consumer-non-cyclicals");
    assert.equal(toSectorSlug("Listed Investment Product"), null);
    assert.equal(SECTORS.length, 11);
  });
});

describe("exposure", () => {
  const companies: Company[] = [
    { symbol: "ASII.JK", name: "Astra", market: "IDX", sector: "industrials", marketCap: 200 },
    { symbol: "UNTR.JK", name: "UT", market: "IDX", sector: "industrials", marketCap: 200 },
    { symbol: "ADRO.JK", name: "Adaro", market: "IDX", sector: "energy", marketCap: 12500 * 10 },
    { symbol: "RE4.SI", name: "Geo", market: "SGX", sector: "energy", marketCap: 1 },
  ];
  const e = exposureBySector(GRAPH, companies);

  it("counts an emiten once, at its strongest relation", () => {
    // ASII is half the sector; parent (1.0) beats the indirect 0.7 row.
    near(e.get("industrials")!.score, 0.5);
    assert.equal(e.get("industrials")!.links.length, 2);
  });

  it("converts SGX-only caps at the configured rate", () => {
    // 1 SGD-bn × 12500 over (125000 + 12500) sector cap, × 0.6.
    near(e.get("energy")!.score, 0.6 * (12500 / 125000));
  });
});

describe("sensitivity", () => {
  it("finds a planted lag and ignores noise", () => {
    const n = rng(7);
    const dates = weekdays(520);
    const sgx: Series = new Map(dates.map((d) => [d, 0.01 * n()]));
    const sgxVals = dates.map((d) => sgx.get(d)!);
    const linked: Series = new Map(dates.slice(1).map((d, i) => [d, 0.6 * sgxVals[i] + 0.004 * n()]));
    const noise: Series = new Map(dates.map((d) => [d, 0.01 * n()]));

    const idx = new Map(SECTORS.map((s) => [s.slug, s.slug === "industrials" ? linked : noise]));
    const res = sensitivityBySector({
      idx,
      sgx: new Map(SECTORS.map((s) => [s.slug, { series: sgx, source: "linked-basket" as const }])),
      controls: new Map(),
    });
    const ind = res.get("industrials")!;
    assert.ok(ind.significant);
    near(ind.beta!, 0.6, 0.05);
    assert.equal(ind.stability, 1);
    assert.ok(ind.score > 0.5);
    // Shared noise series: whatever it shows, it can't be more than chance for most sectors.
    assert.ok([...res.values()].filter((r) => r.significant).length <= 2);
  });

  it("scores zero without enough history", () => {
    const res = sensitivityBySector({ idx: new Map(), sgx: new Map(), controls: new Map() });
    assert.equal(res.get("energy")!.score, 0);
    assert.equal(res.get("energy")!.beta, null);
  });
});

const TAX: EventTaxonomy = {
  negationWindow: 5,
  headlineWeight: 2,
  negations: ["denies", "not", "rules out"],
  events: {
    profit_warning: { direction: -1, materiality: 1, patterns: ["profit warning"] },
    acquisition: { direction: 1, materiality: 0.8, patterns: ["acquir(e|es|ed|ition)"] },
  },
};

describe("trigger", () => {
  const classify = compileTaxonomy(TAX);

  it("weights headlines over bodies", () => {
    assert.deepEqual(classify({ title: "Profit warning at JC&C", body: "" })[0].weight, 2);
    assert.deepEqual(classify({ title: "Results", body: "a profit warning was issued" })[0].where, "body");
  });

  it("drops negated matches", () => {
    assert.equal(classify({ title: "Company denies it will issue a profit warning", body: "" }).length, 0);
    assert.equal(classify({ title: "Board rules out any acquisition", body: "" }).length, 0);
    // Outside the 5-token window the negation no longer applies.
    assert.equal(classify({ title: "Not today, says CEO, one two three four: profit warning", body: "" }).length, 1);
  });

  it("resolves aliases through the exposure graph", () => {
    const res = triggerBySector(
      [{ id: "n1", publishedAt: "2026-09-23T23:00:00Z", title: "Jardine Cycle & Carriage issues profit warning", body: "", symbols: [], url: null }],
      "2026-09-24",
      TAX,
      { "C07.SI": ["Jardine Cycle & Carriage"] },
      GRAPH,
    );
    const ind = res.get("industrials")!;
    assert.equal(ind.events.length, 1);
    assert.equal(ind.events[0].entity, "C07.SI");
    near(ind.score, -2);
    assert.equal(res.get("energy")!.events.length, 0);
  });
});

describe("flow", () => {
  const tx = (o: Partial<OwnershipTx>): OwnershipTx => ({
    id: Math.random().toString(),
    date: "2026-09-24",
    symbol: "ASII.JK",
    sector: "industrials",
    holderName: "Someone",
    holderType: "insider",
    txType: "buy",
    value: 1e9,
    pctChange: null,
    tags: [],
    ...o,
  });

  it("signs, decays and down-weights financing", () => {
    near(txScore(tx({}), "2026-09-24"), Math.log1p(1e9));
    near(txScore(tx({ txType: "sell" }), "2026-09-24"), -Math.log1p(1e9));
    near(txScore(tx({ date: "2026-09-17" }), "2026-09-24"), Math.log1p(1e9) / 2);
    near(txScore(tx({ tags: ["private placement"] }), "2026-09-24"), Math.log1p(1e9) * DEFAULT_FLOW.financingWeight);
    assert.equal(txScore(tx({ txType: "others" }), "2026-09-24"), 0);
  });

  it("records SGX-linked holders", () => {
    const res = flowBySector([tx({ holderName: "Jardine Cycle & Carriage Ltd" })], "2026-09-24", { "C07.SI": ["Jardine Cycle & Carriage"] });
    assert.deepEqual(res.get("industrials")!.linkedHolders, ["C07.SI"]);
    assert.ok(res.get("industrials")!.intensity > 0);
  });
});

describe("compose", () => {
  it("is multiplicative: no structural link, no attention", () => {
    assert.equal(attention(0, 1, 1, 1), 0);
    near(attention(0.5, 0.2, 0.3, 0.1), 0.5 * 0.7 * 1.4);
  });

  it("ranks by attention", () => {
    const empty = { score: 0, intensity: 0, events: [] };
    const sens = { beta: null, pValue: null, pAdjusted: null, stability: null, r2: null, n: 0, windows: 0, significant: false, score: 0, sgxSeries: "sti" as const, controls: [], reverse: { beta: null, pValue: null, pAdjusted: null, significant: false } };
    const rows = compose({
      exposure: new Map(SECTORS.map((s) => [s.slug, { score: s.slug === "energy" ? 0.4 : 0.1, links: [] }])),
      sensitivity: new Map(SECTORS.map((s) => [s.slug, sens])),
      flow: new Map(SECTORS.map((s) => [s.slug, { score: 0, intensity: 0, count: 0, buys: 0, sells: 0, financing: 0, linkedHolders: [] }])),
      trigger: new Map(SECTORS.map((s) => [s.slug, empty])),
      confidence: new Map(),
    });
    assert.equal(rows[0].slug, "energy");
    assert.equal(rows[0].rank, 1);
    near(rows[0].attention, 0.2);
  });
});
