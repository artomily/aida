import { connection } from "next/server";
import { getStore } from "../../db/store";
import type { Snapshot } from "../../scoring/types";

/**
 * The dashboard's only data access: one snapshot row. Upstream is never touched on read.
 * `connection()` keeps the read at request time, so a new morning snapshot shows up without
 * a rebuild.
 */
export async function loadSnapshot(date?: string): Promise<Snapshot | null> {
  await connection();
  return (await getStore()).getSnapshot(date);
}
