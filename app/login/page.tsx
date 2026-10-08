import type { Metadata } from "next";
import AuthPage from "../components/AuthPage";

export const metadata: Metadata = { title: "Masuk — Aida", robots: { index: false } };

export default async function Login({ searchParams }: PageProps<"/login">) {
  return <AuthPage mode="login" next={(await searchParams).next} />;
}
