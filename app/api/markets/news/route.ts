import type { NextRequest } from "next/server";
import { SECTOR_ORDER } from "../../../lib/markets/sectors";
import { getNews } from "../../../lib/markets/service";
import type { SectorSlug } from "../../../lib/markets/types";

const SLUGS = new Set<string>(SECTOR_ORDER.map((s) => s.slug));

/** GET /api/markets/news?sector=energy&symbols=ASII.JK,C07.SI */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const sectorParam = q.get("sector");
  const sector = sectorParam && SLUGS.has(sectorParam) ? (sectorParam as SectorSlug) : undefined;
  const symbols = (q.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9]{2,6}\.(JK|SI)$/.test(s))
    .slice(0, 40);
  return Response.json(await getNews({ sector, symbols }));
}
