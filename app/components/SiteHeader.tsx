import { getCurrentUser } from "../lib/auth";
import Header from "./Header";
import { BookIcon, GridIcon, HomeIcon } from "./ui";

type Page = "board" | "sector" | "methodology";

/** Site navigation — plain links, so every page stays a server component. */
export default async function SiteHeader({ current, sectorHref }: { current: Page; sectorHref?: string }) {
  const user = await getCurrentUser();
  return (
    <Header
      items={[
        { label: "Peringkat", icon: <HomeIcon />, href: "/dashboard", current: current === "board" },
        { label: "Sektor", icon: <GridIcon />, href: sectorHref ?? "/sector/industrials", current: current === "sector" },
        { label: "Metodologi", icon: <BookIcon />, href: "/methodology", current: current === "methodology", divider: true },
      ]}
      cta={{ label: "Cara membaca skor", href: "/methodology#rumus" }}
      account={user}
    />
  );
}
