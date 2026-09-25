/**
 * IDX insider and institutional ownership transactions (`/filings/`). 1 credit per page of 30.
 */
import { toSectorSlug } from "../scoring/sectors";
import type { OwnershipTx } from "../scoring/types";
import { HOURLY, allPages, num, str } from "./client";

type FilingRow = {
  title?: string | null;
  source?: string | null;
  timestamp?: string | null;
  sector?: string | null;
  sub_sector?: string | null;
  tags?: string[] | null;
  symbol?: string | null;
  transaction_type?: string | null;
  holder_type?: string | null;
  holder_name?: string | null;
  transaction_value?: number | string | null;
  share_percentage_before?: number | string | null;
  share_percentage_after?: number | string | null;
};

export async function fetchFilings(start: string, maxPages = 40): Promise<OwnershipTx[]> {
  const rows = await allPages<FilingRow>("/filings/", { start }, 30, HOURLY, maxPages);
  return rows
    .filter((r) => r.symbol && r.timestamp)
    .map((r) => {
      const symbol = r.symbol!.toUpperCase().endsWith(".JK") ? r.symbol!.toUpperCase() : r.symbol!.toUpperCase() + ".JK";
      const type = (r.transaction_type ?? "").toLowerCase();
      const before = num(r.share_percentage_before);
      const after = num(r.share_percentage_after);
      return {
        id: r.source ?? `${symbol}|${r.timestamp}|${r.holder_name}|${r.transaction_value}`,
        date: r.timestamp!,
        symbol,
        sector: toSectorSlug(str(r.sector), str(r.sub_sector)),
        holderName: r.holder_name ?? "",
        holderType: str(r.holder_type)?.toLowerCase() ?? null,
        txType: type === "buy" || type === "sell" ? type : "others",
        value: num(r.transaction_value),
        pctChange: before !== null && after !== null ? after - before : null,
        // Title words ride along so "placement" / "repo" in the filing text is caught too.
        tags: [...(r.tags ?? []), r.title ?? ""],
      };
    });
}
