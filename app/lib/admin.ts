import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, SESSION_HOURS, signSession, verifySession } from "./admin-token";

/**
 * The real admin check. `proxy.ts` only redirects early; every admin page and server action
 * calls this again, because a server action can be invoked directly by its id.
 */
export async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifySession(token)) redirect("/admin/login");
}

/** Set the admin cookie — from /admin/login, or when the ADMIN_EMAIL account signs in on /login. */
export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, signSession()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}
