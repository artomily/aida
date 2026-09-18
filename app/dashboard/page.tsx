import type { Metadata } from "next";
import Dashboard from "../components/Dashboard";

export const metadata: Metadata = {
  title: "Papan hari ini — Divergence",
  description: "Sektor IDX yang bergerak di luar perkiraan pasar Asia pagi ini.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
