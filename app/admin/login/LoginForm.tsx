"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="dv-form">
      <label htmlFor="password">Kata sandi admin</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      {state.error && (
        <p role="alert" className="dv-error">
          {state.error}
        </p>
      )}
      <button type="submit" className="ds-cta" disabled={pending}>
        <span>{pending ? "Memeriksa…" : "Masuk"}</span>
      </button>
    </form>
  );
}
