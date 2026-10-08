"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthState } from "../lib/auth-actions";

/** Login and register share one form; register adds the name field and the password hint. */
export default function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState<AuthState, FormData>(isRegister ? register : login, {});
  const other = isRegister ? "/login" : "/register";
  const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;

  return (
    <form action={action} className="au-form">
      {next && <input type="hidden" name="next" value={next} />}
      {isRegister && (
        <div className="au-field">
          <label htmlFor="name">Nama</label>
          <input id="name" name="name" autoComplete="name" maxLength={60} defaultValue={state.name} required autoFocus />
        </div>
      )}
      <div className="au-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          autoFocus={!isRegister}
        />
      </div>
      <div className="au-field">
        <label htmlFor="password">Kata sandi</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined}
          aria-describedby={isRegister ? "password-hint" : undefined}
          required
        />
        {isRegister && (
          <p id="password-hint" className="au-hint">
            Minimal 8 karakter.
          </p>
        )}
      </div>
      {state.error && (
        <p role="alert" className="au-error">
          {state.error}
        </p>
      )}
      <button type="submit" className="au-btn" disabled={pending}>
        {pending ? "Memeriksa…" : isRegister ? "Daftar" : "Masuk"}
        <span className="au-btn-box" aria-hidden="true">
          <svg viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <p className="au-hint au-switch">
        {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link href={otherHref}>{isRegister ? "Masuk" : "Daftar"}</Link>
      </p>
    </form>
  );
}
