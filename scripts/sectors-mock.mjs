/**
 * Local stand-in for api.sectors.app that counts every request — measure call volume for free.
 *   node scripts/sectors-mock.mjs            (listens on :4010)
 *   SECTORS_API_BASE=http://127.0.0.1:4010/v2 SECTORS_API_KEY=mock next dev -p 3100
 * GET /__stats returns the per-endpoint counts; GET /__reset zeroes them.
 */
import http from "node:http";

const counts = new Map();
let total = 0;
const bump = (k) => { counts.set(k, (counts.get(k) ?? 0) + 1); total++; };
const key = (p) => p.replace(/\/v2/, "").replace(/\/[A-Z0-9]{3,5}\/$/, "/{sym}/").replace(/ownership\/[^/]+\//, "ownership/{slug}/");

const page = (rows, offset, limit, totalCount) => ({
  results: rows,
  pagination: { total_count: totalCount, showing: rows.length, limit, offset, has_next: offset + limit < totalCount, next_offset: offset + limit < totalCount ? offset + limit : null },
});
const SECT = ["Financials", "Energy", "Basic Materials", "Industrials", "Technology", "Healthcare", "Infrastructures", "Properties & Real Estate", "Transportation & Logistic", "Consumer Cyclicals", "Consumer Non-Cyclicals"];

function screener(sgx, q) {
  const limit = +(q.get("limit") ?? 50), offset = +(q.get("offset") ?? 0), n = sgx ? 568 : 962;
  const rows = Array.from({ length: Math.max(0, Math.min(limit, n - offset)) }, (_, i) => {
    const k = offset + i;
    const sym = sgx ? `S${String(k).padStart(3, "0")}.SI` : `I${String(k).padStart(3, "0")}`.slice(0, 4) + ".JK";
    const sector = SECT[k % SECT.length];
    return { symbol: sym, company_name: `Mock ${sym}`, query_values: { market_cap: 1e12 / (k + 1), sector, sub_sector: sector, last_close_price: 1000, [sgx ? "change_1d" : "daily_close_change"]: ((k % 7) - 3) / 100 } };
  });
  return page(rows, offset, limit, n);
}
function news(sgx, q) {
  const limit = +(q.get("limit") ?? 20), offset = +(q.get("offset") ?? 0);
  const rows = Array.from({ length: limit }, (_, i) => ({ title: `Mock news ${offset + i}`, body: "", source: `https://example.com/${sgx ? "s" : "i"}${offset + i}`, timestamp: new Date(Date.now() - (offset + i) * 6e5).toISOString(), symbols: [], sector: SECT[i % 11], tags: [] }));
  return page(rows, offset, limit, 500);
}
const days = () => Array.from({ length: 60 }, (_, i) => ({ date: new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), close: 1000 + Math.sin(i) * 20 }));

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/__stats") { res.end(JSON.stringify({ total, byEndpoint: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])) }, null, 2)); return; }
  if (u.pathname === "/__reset") { counts.clear(); total = 0; res.end("ok"); return; }
  bump(key(u.pathname));
  const p = u.pathname, q = u.searchParams;
  let body;
  if (p === "/v2/companies/") body = screener(false, q);
  else if (p === "/v2/sgx/companies/") body = screener(true, q);
  else if (p === "/v2/news/") body = news(false, q);
  else if (p === "/v2/sgx/news/") body = news(true, q);
  else if (p.startsWith("/v2/company/report/")) body = { symbol: "X.JK", overview: { affiliates: [] }, management: { key_executives: [] }, ownership: { major_shareholders: [], conglomerates_group: [] } };
  else if (p.startsWith("/v2/daily/") || p.startsWith("/v2/sgx/daily/")) body = days();
  else if (p === "/v2/mining/companies/") body = page([], 0, 30, 0);
  else { res.statusCode = 404; body = { error: "mock: unknown path" }; }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}).listen(4010, () => console.log("sectors mock on :4010"));
