import type { NextRequest } from "next/server";
import { getStore } from "../../../../db/store";
import { isSectorSlug } from "../../../../scoring/sectors";

/** One sector's score breakdown and linked entities from the latest (or `?date=`) snapshot. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/sector/[slug]">) {
  const { slug } = await ctx.params;
  if (!isSectorSlug(slug)) return Response.json({ error: `unknown sector ${slug}` }, { status: 404 });
  const snapshot = await (await getStore()).getSnapshot(req.nextUrl.searchParams.get("date") ?? undefined);
  const sector = snapshot?.sectors.find((s) => s.slug === slug);
  if (!snapshot || !sector) return Response.json({ error: "no snapshot" }, { status: 404 });
  return Response.json(
    { date: snapshot.date, mode: snapshot.mode, validation: { alpha: snapshot.validation.alpha, window: snapshot.validation.window }, sector },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
