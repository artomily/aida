import { getLinks } from "../../../lib/markets/service";

export async function GET() {
  return Response.json(await getLinks());
}
