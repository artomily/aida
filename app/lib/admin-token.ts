/**
 * Stateless admin session: `<expiry>.<hmac>` in an httpOnly cookie, keyed off ADMIN_PASSWORD so
 * changing the password signs everyone out. No `server-only` import: `proxy.ts` uses it too.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "dv_admin";
export const SESSION_HOURS = 12;

const key = () => {
  const password = process.env.ADMIN_PASSWORD;
  return password ? createHash("sha256").update(`divergence-admin:${password}`).digest() : null;
};

const mac = (k: Buffer, payload: string) => createHmac("sha256", k).update(payload).digest("base64url");

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD);

export function signSession(now = Date.now()): string | null {
  const k = key();
  if (!k) return null;
  const exp = String(now + SESSION_HOURS * 3_600_000);
  return `${exp}.${mac(k, exp)}`;
}

export function verifySession(token: string | undefined, now = Date.now()): boolean {
  const k = key();
  if (!k || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !(Number(exp) > now)) return false;
  const want = Buffer.from(mac(k, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Constant-time password check. */
export function passwordMatches(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(password).digest();
  return timingSafeEqual(a, b);
}
