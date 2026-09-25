/**
 * Company universe with sector and market cap, from the screeners. Feeds sector market-cap
 * totals (Exposure) and the constituent list for sector returns. ~6 IDX + ~3 SGX pages.
 */
import { toSectorSlug } from "../scoring/sectors";
import type { Company, Market } from "../scoring/types";
import { DAY, allPages, num, str } from "./client";

type ScreenerRow = { symbol: string; company_name: string; query_values?: Record<string, unknown> } & Record<string, unknown>;

/*
 * The screener only echoes fields named in `where` / `order_by` inside `query_values`, so every
 * field we read is named in the filter.
 */
const WHERE = "market_cap > 0 and sector IS NOT NULL and sub_sector IS NOT NULL";

export async function fetchCompanies(market: Market): Promise<Company[]> {
  const rows = await allPages<ScreenerRow>(
    market === "IDX" ? "/companies/" : "/sgx/companies/",
    { where: WHERE, order_by: "-market_cap", include_query_values: "true" },
    200,
    DAY,
    market === "IDX" ? 6 : 4,
  );
  return rows.map((r) => {
    const q = { ...r, ...(r.query_values ?? {}) };
    const suffix = market === "IDX" ? ".JK" : ".SI";
    const symbol = r.symbol.toUpperCase();
    return {
      symbol: symbol.endsWith(suffix) ? symbol : symbol + suffix,
      name: r.company_name,
      market,
      sector: toSectorSlug(str(q.sector), str(q.sub_sector)),
      marketCap: num(q.market_cap),
    };
  });
}
