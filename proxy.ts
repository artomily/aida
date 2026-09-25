import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySession } from "./app/lib/admin-token";

/**
 * Optimistic gate for the admin area: bounce anyone without a valid session cookie before the
 * page renders. The pages and server actions verify again (app/lib/admin.ts).
 */
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (verifySession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
