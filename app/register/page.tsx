import type { Metadata } from "next";
import AuthPage from "../components/AuthPage";

export const metadata: Metadata = { title: "Daftar — Aida", robots: { index: false } };

export default async function Register({ searchParams }: PageProps<"/register">) {
  return <AuthPage mode="register" next={(await searchParams).next} />;
}
