import type { Metadata } from "next";
import Landing from "./components/Landing";

export const metadata: Metadata = {
  title: "Divergence — tahu lebih dulu sektor IDX mana yang bergerak aneh",
  description:
    "Setiap pagi sebelum 10:05 WIB, Divergence menandai sektor IDX yang bergerak di luar perkiraan pasar Asia — dijelaskan dengan bahasa sehari-hari.",
};

export default function Home() {
  return <Landing />;
}
