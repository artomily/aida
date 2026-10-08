"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "../../db/store";
import { startAdminSession } from "./admin";
import { ADMIN_COOKIE } from "./admin-token";
import { authEnabled, endSession, envAccounts, hashPassword, matchEnvAccount, safeNext, startSession, verifyPassword } from "./auth";

export type AuthState = { error?: string; email?: string; name?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
/** Hashed when the email is unknown, so a miss costs as long as a wrong password. */
const DUMMY_HASH = hashPassword("aida-timing-pad");

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const name = field(form, "name");
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const keep = { name, email };

  if (!authEnabled()) return { ...keep, error: "AUTH_SECRET belum diatur di environment." };
  if (!name || name.length > 60) return { ...keep, error: "Isi nama (maksimal 60 karakter)." };
  if (!EMAIL.test(email) || email.length > 254) return { ...keep, error: "Format email tidak valid." };
  if (password.length < MIN_PASSWORD) return { ...keep, error: `Kata sandi minimal ${MIN_PASSWORD} karakter.` };
  if (password.length > 256) return { ...keep, error: "Kata sandi terlalu panjang." };
  // Env accounts sign in with their configured password; nobody may claim the address first.
  if (envAccounts().some((a) => a.email === email)) return { ...keep, error: "Email ini sudah terdaftar. Silakan masuk." };

  const id = randomUUID();
  const created = await (await getStore()).createUser({
    id,
    email,
    name,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  if (!created) return { ...keep, error: "Email ini sudah terdaftar. Silakan masuk." };

  await startSession(id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!authEnabled()) return { email, error: "AUTH_SECRET belum diatur di environment." };

  const account = matchEnvAccount(email, password);
  if (account) {
    const store = await getStore();
    let existing = await store.getUserByEmail(email);
    if (!existing) {
      existing = { id: randomUUID(), email, name: account.name, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
      // Lost a race with a parallel first login: use the row that won.
      if (!(await store.createUser(existing))) existing = await store.getUserByEmail(email);
    }
    if (existing) {
      await startSession(existing.id);
      if (account.admin) await startAdminSession();
      redirect(safeNext(form.get("next")));
    }
  }

  const user = email && password ? await (await getStore()).getUserByEmail(email) : null;
  const ok = await verifyPassword(password, user?.passwordHash ?? (await DUMMY_HASH));
  if (!user || !ok) {
    // Slow down guessing without keeping any state.
    await new Promise((r) => setTimeout(r, 800));
    return { email, error: "Email atau kata sandi salah." };
  }

  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/");
}
