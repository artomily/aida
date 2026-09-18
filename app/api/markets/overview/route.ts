import { getOverview } from "../../../lib/markets/service";

// Upstream fetches carry their own revalidate windows (see sectorsApp.ts); the handler stays dynamic.
export async function GET() {
  return Response.json(await getOverview());
}
