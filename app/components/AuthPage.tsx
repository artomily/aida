import { redirect } from "next/navigation";
import { authEnabled, getCurrentUser, safeNext } from "../lib/auth";
import AuthForm from "./AuthForm";
import SiteHeader from "./SiteHeader";
import { Glass } from "./ui";

const COPY = {
  login: { eyebrow: "Aida · Masuk", title: "Masuk ke akun Aida" },
  register: { eyebrow: "Aida · Daftar", title: "Buat akun Aida" },
} as const;

/** Shared shell for /login and /register. Signed-in visitors go straight to where they were headed. */
export default async function AuthPage({ mode, next }: { mode: "login" | "register"; next?: string | string[] }) {
  const target = typeof next === "string" ? safeNext(next) : undefined;
  if (await getCurrentUser()) redirect(target ?? "/dashboard");

  return (
    <div className="ds-shell">
      <SiteHeader current="account" />
      <main className="dv-login">
        <Glass delay={0}>
          <p className="ds-eyebrow">{COPY[mode].eyebrow}</p>
          <h1 className="ds-h2" style={{ fontSize: 26, margin: "6px 0 18px" }}>
            {COPY[mode].title}
          </h1>
          {authEnabled() ? (
            <AuthForm mode={mode} next={target} />
          ) : (
            <p className="ds-body">
              Akun nonaktif: atur <code>AUTH_SECRET</code> di environment lalu muat ulang.
            </p>
          )}
        </Glass>
      </main>
    </div>
  );
}
