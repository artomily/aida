/**
 * Smoke-test the sectors.app v2 assumptions baked into app/lib/markets/sectorsApp.ts.
 *   node --env-file=.env.local scripts/sectors-smoke.mjs
 * Costs ~8 credits. 400s are free, so the probes that may be rejected are safe to run.
 */
const KEY = process.env.SECTORS_API_KEY;
if (!KEY) {
  console.error("SECTORS_API_KEY kosong. Isi .env.local lalu jalankan: node --env-file=.env.local scripts/sectors-smoke.mjs");
  process.exit(1);
}
const BASE = "https://api.sectors.app/v2";

async function probe(label, path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: KEY } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  console.log(`\n── ${label}  [${res.status}]  ${url.pathname}${url.search.slice(0, 120)}`);
  if (!res.ok) { console.log("   ", typeof body === "string" ? body : JSON.stringify(body).slice(0, 300)); return null; }
  const rows = Array.isArray(body) ? body : (body.results ?? body);
  console.log("    sample:", JSON.stringify(Array.isArray(rows) ? rows[0] : rows).slice(0, 600));
  if (body?.pagination) console.log("    pagination:", JSON.stringify(body.pagination));
  return body;
}

// 1. Does `IS NOT NULL` survive the screener parser, and does query_values echo every field in `where`?
const idxNull = await probe("IDX screener (IS NOT NULL)", "/companies/", {
  where: "market_cap > 0 and sector IS NOT NULL and sub_sector IS NOT NULL and last_close_price > 0 and daily_close_change IS NOT NULL",
  order_by: "-market_cap", include_query_values: "true", limit: 2,
});
// 2. Fallback phrasing using only the documented operators, in case (1) 400s.
await probe("IDX screener (operators only)", "/companies/", {
  where: "market_cap > 0 and last_close_price > 0 and sub_sector != '' and sector != ''",
  order_by: "-market_cap", include_query_values: "true", limit: 2,
});
await probe("SGX screener (IS NOT NULL)", "/sgx/companies/", {
  where: "market_cap > 0 and sector IS NOT NULL and sub_sector IS NOT NULL and last_close_price > 0 and change_1d IS NOT NULL",
  order_by: "-market_cap", include_query_values: "true", limit: 2,
});
await probe("SGX screener (operators only)", "/sgx/companies/", {
  where: "market_cap > 0 and last_close_price > 0 and sub_sector != '' and sector != ''",
  order_by: "-market_cap", include_query_values: "true", limit: 2,
});
await probe("IDX news", "/news/", { extension: "idx", limit: 2 });
await probe("SGX news", "/sgx/news/", { limit: 2 });
await probe("IDX report (3 sections)", "/company/report/BBCA/", { sections: "overview,management,ownership" });
const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
await probe("IDX daily", "/daily/BBCA/", { start: weekAgo, end: today });
await probe("SGX daily", "/sgx/daily/D05/", { start: weekAgo, end: today });

// 3. Mining extension — the only corporate-structure (parent/subsidiary) source.
const mining = await probe("mining companies (keyword ADRO)", "/mining/companies/", { keyword: "ADRO", limit: 5 });
const slug = mining?.results?.find((r) => (r.symbol ?? "").toUpperCase().startsWith("ADRO"))?.slug ?? mining?.results?.[0]?.slug;
if (slug) await probe(`mining ownership (${slug})`, `/mining/companies/ownership/${slug}/`);

if (idxNull) console.log("\nquery_values keys:", Object.keys(idxNull.results?.[0]?.query_values ?? {}).join(", ") || "(none)");
