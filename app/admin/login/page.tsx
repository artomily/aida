import type { Metadata } from "next";
import { Glass } from "../../components/ui";
import { adminEnabled } from "../../lib/admin-token";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Admin — Divergence", robots: { index: false } };

export default function AdminLogin() {
  return (
    <>
      <div className="ds-plate" aria-hidden="true" />
      <div className="ds-shell">
        <main className="dv-login">
          <Glass delay={0}>
            <p className="ds-eyebrow">Divergence · Admin</p>
            <h1 className="ds-h2" style={{ fontSize: 26, margin: "6px 0 18px" }}>
              Pantau data sebelum sampai ke user
            </h1>
            {adminEnabled() ? (
              <LoginForm />
            ) : (
              <p className="ds-body">
                Area admin nonaktif: atur <code>ADMIN_PASSWORD</code> di environment lalu muat ulang.
              </p>
            )}
          </Glass>
        </main>
      </div>
    </>
  );
}
