import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getStore } from "../../db/store";

/**
 * Site accounts: email + password, scrypt-hashed, with a stateless signed session cookie
 * (`<userId>.<expiry>.<hmac>`). Same shape as the admin session (admin-token.ts), keyed off
 * AUTH_SECRET instead — rotating it signs everyone out.
 */
export const USER_COOKIE = "aida_session";
export const USER_SESSION_DAYS = 30;

export type SessionUser = { id: string; email: string; name: string };

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = await scryptAsync(password, Buffer.from(salt, "base64url"), want.length);
  return timingSafeEqual(want, got);
}

/** A fixed dev secret keeps `next dev` usable without setup; production must set AUTH_SECRET. */
const secret = () => process.env.AUTH_SECRET || (process.env.NODE_ENV === "production" ? null : "aida-dev-only-secret");

export const authEnabled = () => Boolean(secret());

const mac = (payload: string) => createHmac("sha256", secret()!).update(`aida-user:${payload}`).digest("base64url");

function verifyToken(token: string | undefined, now = Date.now()): string | null {
  if (!token || !secret()) return null;
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig || !(Number(exp) > now)) return null;
  const want = Buffer.from(mac(`${id}.${exp}`));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

export async function startSession(userId: string) {
  const exp = String(Date.now() + USER_SESSION_DAYS * 86_400_000);
  (await cookies()).set(USER_COOKIE, `${userId}.${exp}.${mac(`${userId}.${exp}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(USER_COOKIE);
}

/** The signed-in user, or null. Deduplicated per request, so headers and pages can both ask. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const id = verifyToken((await cookies()).get(USER_COOKIE)?.value);
  if (!id) return null;
  try {
    const user = await (await getStore()).getUserById(id);
    return user ? { id: user.id, email: user.email, name: user.name } : null;
  } catch (err) {
    // A storage hiccup shouldn't take the public pages down with it.
    console.error("getCurrentUser failed", err);
    return null;
  }
});

/** For pages that need an account: bounce to /login and come back afterwards. */
export async function requireUser(back = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  return user;
}

/** Only same-site paths are valid redirect targets after login. */
export const safeNext = (next: unknown, fallback = "/dashboard") =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
