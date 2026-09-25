/**
 * Local stand-in for api.sectors.app — runs the whole pipeline end to end for free and counts
 * every request, so call volume can be measured before spending real credits.
 *
 *   npm run mock:sectors                      (listens on :4010)
 *   SECTORS_API_BASE=http://127.0.0.1:4010/v2 SECTORS_API_KEY=mock DIVERGENCE_DATA_DIR=.data-mock npm run ingest:backfill
 *
 * GET /__stats returns per-endpoint counts; GET /__reset zeroes them.
 *
 * Everything served here is synthetic. Prices are seeded random walks; a planted lead-lag
 * (IDX industrials and consumer staples follow the previous SGX session) lets the regression
 * find *something* so the whole path is exercised. Headlines are labelled MOCK.
 */
import http from "node:http";

const counts = new Map();
let total = 0;
const bump = (k) => {
  counts.set(k, (counts.get(k) ?? 0) + 1);
  total++;
};
const key = (p) =>
  p
    .replace(/\/v2/, "")
    .replace(/\/(daily|sgx\/daily|index-daily)\/[^/]+\//, "/$1/{sym}/")
    .replace(/ownership\/[^/]+\//, "ownership/{slug}/");

const page = (rows, offset, limit, totalCount) => ({
  results: rows,
  pagination: {
    total_count: totalCount,
    showing: rows.length,
    limit,
    offset,
    has_next: offset + limit < totalCount,
    next_offset: offset + limit < totalCount ? offset + limit : null,
  },
});

/* ── universe: the curated tickers plus fillers, so exposure has something to hit ── */

const IDX = [
  ["ASII", "Industrials", 200e12], ["UNTR", "Industrials", 90e12], ["IDXA", "Industrials", 30e12], ["IDXB", "Industrials", 20e12],
  ["INDF", "Consumer Non-Cyclicals", 60e12], ["SMAR", "Consumer Non-Cyclicals", 15e12], ["SIMP", "Consumer Non-Cyclicals", 7e12],
  ["LSIP", "Consumer Non-Cyclicals", 6e12], ["AALI", "Consumer Non-Cyclicals", 12e12], ["ICBP", "Consumer Non-Cyclicals", 120e12],
  ["BBCA", "Financials", 1100e12], ["BBRI", "Financials", 600e12], ["NISP", "Financials", 25e12],
  ["TLKM", "Infrastructures", 300e12], ["TOWR", "Infrastructures", 50e12],
  ["BSDE", "Properties & Real Estate", 20e12], ["DUTI", "Properties & Real Estate", 8e12], ["LPKR", "Properties & Real Estate", 7e12], ["CTRA", "Properties & Real Estate", 18e12],
  ["SILO", "Healthcare", 35e12], ["KLBF", "Healthcare", 70e12],
  ["SMDR", "Transportation & Logistic", 6e12], ["ASSA", "Transportation & Logistic", 3e12],
  ["ADRO", "Energy", 80e12], ["PTBA", "Energy", 35e12],
  ["ANTM", "Basic Materials", 40e12], ["GOTO", "Technology", 90e12], ["MAPI", "Consumer Cyclicals", 25e12],
  ["XLIP", "Listed Investment Product", 1e12],
];
const SGX = [
  ["C07", "Industrials", 11e9], ["J36", "Industrials", 15e9], ["O39", "Financials", 75e9], ["Z74", "Communication Services", 50e9],
  ["E5H", "Consumer Non-Cyclicals", 3.5e9], ["5JS", "Consumer Non-Cyclicals", 0.5e9], ["EB5", "Consumer Non-Cyclicals", 2.5e9],
  ["P8Z", "Consumer Non-Cyclicals", 1.2e9], ["P34", "Consumer Non-Cyclicals", 0.5e9], ["F34", "Consumer Non-Cyclicals", 20e9],
  ["RE4", "Energy", 0.4e9], ["A26", "Real Estate", 1e9], ["D5IU", "REIT", 0.2e9], ["LJ3", "Real Estate", 1.5e9],
  ["AW9U", "REIT", 0.5e9], ["S56", "Industrials", 0.3e9], ["D05", "Financials", 100e9],
];

function screener(sgx, q) {
  const list = sgx ? SGX : IDX;
  const limit = +(q.get("limit") ?? 50);
  const offset = +(q.get("offset") ?? 0);
  const rows = list.slice(offset, offset + limit).map(([sym, sector, cap]) => ({
    symbol: sgx ? `${sym}.SI` : `${sym}.JK`,
    company_name: `Mock ${sym}`,
    query_values: { market_cap: cap, sector, sub_sector: sector },
  }));
  return page(rows, offset, limit, list.length);
}

/* ── prices: seeded random walks with a planted SGX → IDX lag ── */

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}
/** Deterministic N(0,1) from a string seed. */
const gauss = (seed) => Math.sqrt(-2 * Math.log(hash(seed + "a") + 1e-12)) * Math.cos(2 * Math.PI * hash(seed + "b"));

const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const weekday = (t) => ![0, 6].includes(new Date(t).getUTCDay());
const EPOCH = Date.parse("2022-06-01");
const prevWeekday = (t) => {
  let p = t - DAY;
  while (!weekday(p)) p -= DAY;
  return p;
};

const sgxFactor = (t) => 0.009 * gauss("sgx|" + iso(t));
const LAGGED = new Set(["ASII", "UNTR", "IDXA", "IDXB", "INDF", "SMAR", "SIMP", "LSIP", "AALI", "ICBP"]);

function dailyReturn(sym, t, sgx) {
  if (sgx || sym === "STI") return sgxFactor(t) + 0.006 * gauss(sym + "|" + iso(t));
  const lag = LAGGED.has(sym) ? 0.45 * sgxFactor(prevWeekday(t)) : 0;
  return lag + 0.012 * gauss(sym + "|" + iso(t));
}

const levels = new Map();
/** Close on day t: compounding from EPOCH, memoised per symbol. */
function close(sym, t, sgx) {
  let m = levels.get(sym);
  if (!m) levels.set(sym, (m = new Map()));
  if (m.has(t)) return m.get(t);
  let level = 1000 * (1 + hash(sym));
  for (let d = EPOCH; d <= t; d += DAY) {
    if (!weekday(d)) continue;
    level *= 1 + dailyReturn(sym, d, sgx);
    m.set(d, level);
  }
  return m.get(t);
}

function daily(sym, sgx, q, field = "close") {
  const end = Math.min(Date.parse(q.get("end") ?? iso(Date.now())), Date.now());
  const start = Math.max(Date.parse(q.get("start") ?? iso(end - 30 * DAY)), end - 89 * DAY, EPOCH);
  const rows = [];
  for (let t = Date.parse(iso(start)); t <= end; t += DAY)
    if (weekday(t)) rows.push({ symbol: sym, date: iso(t), [field]: +close(sym, t, sgx).toFixed(2) });
  return rows;
}

function universeClose(q) {
  const t = Date.parse(q.get("date") ?? iso(Date.now()));
  const limit = +(q.get("limit") ?? 30);
  const offset = +(q.get("offset") ?? 0);
  const rows = weekday(t) ? IDX.map(([sym]) => ({ symbol: `${sym}.JK`, date: iso(t), close: +close(sym, t, false).toFixed(2) })) : [];
  return page(rows.slice(offset, offset + limit), offset, limit, rows.length);
}

/* ── news & filings ── */

function sgxNews(q) {
  const now = Date.now();
  const rows = [
    { title: "MOCK: Jardine Cycle & Carriage flags profit warning on weaker Astra earnings", symbols: ["C07.SI"], h: 5 },
    { title: "MOCK: Golden Agri-Resources says Indonesia export levy change to hit margins", symbols: ["E5H.SI"], h: 20 },
    { title: "MOCK: Sinarmas Land does not expect profit warning this year", symbols: ["A26.SI"], h: 30 },
    { title: "MOCK: OCBC reports quarterly results in line with guidance", symbols: ["O39.SI"], h: 40 },
    { title: "MOCK: First Resources completes acquisition of plantation estate", symbols: ["EB5.SI"], h: 200 },
  ].map((r, i) => ({ ...r, body: "Synthetic article for pipeline testing.", source: `https://example.com/mock-news-${i}`, timestamp: new Date(now - r.h * 3_600_000).toISOString() }));
  const limit = +(q.get("limit") ?? 30);
  const offset = +(q.get("offset") ?? 0);
  return page(rows.slice(offset, offset + limit), offset, limit, rows.length);
}

function filings(q) {
  const now = Date.now();
  const rows = [
    ["ASII", "industrials", "Jardine Cycle & Carriage Limited", "corporate-investor", "buy", 250e9, 2],
    ["UNTR", "industrials", "Director A", "insider", "sell", 12e9, 4],
    ["SMAR", "consumer-non-cyclicals", "Commissioner B", "insider", "buy", 3e9, 1],
    ["INDF", "consumer-non-cyclicals", "Institution C", "institution", "sell", 40e9, 6],
    ["BSDE", "properties", "Holder D", "corporate-investor", "buy", 5e9, 3],
    ["BBCA", "financials", "Director E", "insider", "buy", 8e9, 9],
  ].map(([sym, sector, holder, type, tx, value, d], i) => ({
    title: `MOCK filing ${i}${i === 3 ? " (private placement)" : ""}`,
    body: "",
    source: `https://example.com/mock-filing-${i}`,
    timestamp: new Date(now - d * DAY).toISOString(),
    sector,
    sub_sector: sector,
    tags: [],
    symbol: `${sym}.JK`,
    transaction_type: tx,
    holder_type: type,
    holder_name: holder,
    transaction_value: value,
    share_percentage_before: 10,
    share_percentage_after: tx === "buy" ? 10.5 : 9.5,
  }));
  const limit = +(q.get("limit") ?? 30);
  const offset = +(q.get("offset") ?? 0);
  return page(rows.slice(offset, offset + limit), offset, limit, rows.length);
}

http
  .createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/__stats") {
      res.end(JSON.stringify({ total, byEndpoint: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])) }, null, 2));
      return;
    }
    if (u.pathname === "/__reset") {
      counts.clear();
      total = 0;
      res.end("ok");
      return;
    }
    bump(key(u.pathname));
    const p = u.pathname;
    const q = u.searchParams;
    let m;
    let body;
    if (p === "/v2/companies/") body = screener(false, q);
    else if (p === "/v2/sgx/companies/") body = screener(true, q);
    else if (p === "/v2/sgx/news/") body = sgxNews(q);
    else if (p === "/v2/filings/") body = filings(q);
    else if (p === "/v2/close/") body = universeClose(q);
    else if ((m = p.match(/^\/v2\/sgx\/daily\/([^/]+)\/$/))) body = daily(m[1], true, q);
    else if ((m = p.match(/^\/v2\/daily\/([^/]+)\/$/))) body = daily(m[1], false, q);
    else if ((m = p.match(/^\/v2\/index-daily\/([^/]+)\/$/))) body = daily(m[1].toUpperCase(), true, q, "price").map((r) => ({ index_code: r.symbol, date: r.date, price: r.price }));
    else {
      res.statusCode = 404;
      body = { error: "mock: unknown path" };
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  })
  .listen(4010, () => console.log("sectors mock on :4010"));
