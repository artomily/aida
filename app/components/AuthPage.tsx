import Link from "next/link";
import { redirect } from "next/navigation";
import { authEnabled, getCurrentUser, safeNext } from "../lib/auth";
import AuthForm from "./AuthForm";
import PixelField from "./PixelField";
import { BrandMark } from "./ui";
import "./auth.css";

const COPY = {
  login: {
    step: "01",
    eyebrow: "Masuk",
    title: "Masuk ke papan",
    lead: "Skor perhatian 11 sektor IDX, diperbarui tiap pagi sebelum pembukaan.",
  },
  register: {
    step: "02",
    eyebrow: "Daftar",
    title: "Buat akun Aida",
    lead: "Satu akun untuk membuka papan peringkat dan detail tiap sektor.",
  },
} as const;

/**
 * Shared shell for /login and /register in the landing's LED-board face: live pixel mosaic on
 * one side, framed form on the other. Signed-in visitors go straight to where they were headed.
 */
export default async function AuthPage({ mode, next }: { mode: "login" | "register"; next?: string | string[] }) {
  const target = typeof next === "string" ? safeNext(next) : undefined;
  if (await getCurrentUser()) redirect(target ?? "/dashboard");
  const copy = COPY[mode];

  return (
    <main className="au-page">
      <aside className="au-led" aria-hidden="true">
        <PixelField className="au-canvas" cell={[5, 12]} heat={0.9} word="AIDA" seed={5} />
        <div className="au-led-copy">
          <p className="au-label">Papan perhatian sektor IDX</p>
          <p className="au-led-line">SGX → IDX · T+1</p>
        </div>
      </aside>

      <section className="au-side">
        <Link className="au-brand" href="/" aria-label="Beranda Aida">
          <BrandMark />
          <b>Aida</b>
        </Link>

        <div className="au-card au-frame">
          <p className="au-eyebrow">
            <span className="au-num">{copy.step}</span>
            <i />
            {copy.eyebrow}
          </p>
          <h1 className="au-title">{copy.title}</h1>
          <p className="au-lead">{copy.lead}</p>
          {authEnabled() ? (
            <AuthForm mode={mode} next={target} />
          ) : (
            <p className="au-error">
              Akun nonaktif: atur <code>AUTH_SECRET</code> di environment lalu muat ulang.
            </p>
          )}
        </div>

        <Link className="au-back" href="/">
          ← Kembali ke beranda
        </Link>
      </section>
    </main>
  );
}
