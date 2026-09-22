import { usage } from "../../../lib/markets/sectorsApp";

/** GET /api/markets/usage — upstream sectors.app calls made by this server in the last hour. */
export async function GET() {
  return Response.json(usage());
}
