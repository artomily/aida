import type { Metadata } from "next";
import Dashboard from "../components/Dashboard";

export const metadata: Metadata = {
  title: "SGX × IDX — Divergence",
  description: "Seluruh saham Singapura dan Indonesia berdampingan per sektor, dengan berita dan efek domino.",
};

export default function SgxIdxPage() {
  return <Dashboard initialView="compare" />;
}
