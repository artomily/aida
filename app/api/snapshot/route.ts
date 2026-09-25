import type { NextRequest } from "next/server";
import { getStore } from "../../../db/store";

/**
 * Today's scores (or `?date=YYYY-MM-DD`). Reads the database only — upstream is never touched
 * on read — and carries derived values only: scores, betas, exposure weights, counts.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  const snapshot = await (await getStore()).getSnapshot(date);
  if (!snapshot) return Response.json({ error: "no snapshot" }, { status: 404 });
  return Response.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
