import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySession } from "./admin-token";

/**
 * The real admin check. `proxy.ts` only redirects early; every admin page and server action
 * calls this again, because a server action can be invoked directly by its id.
 */
export async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifySession(token)) redirect("/admin/login");
}
