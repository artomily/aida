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
  const store = await getStore();
  // Neon's HTTP driver can fail transiently (cold start after scale-to-zero); retry once, then degrade.
  for (let attempt = 0; ; attempt++) {
    try {
      return await store.getSnapshot(date);
    } catch (err) {
      if (attempt >= 1) {
        console.error("loadSnapshot failed", err);
        return null;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
