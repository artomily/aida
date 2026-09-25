import Header from "./Header";
import { BookIcon, GridIcon, HomeIcon } from "./ui";

type Page = "board" | "sector" | "methodology";

/** Site navigation — plain links, so every page stays a server component. */
export default function SiteHeader({ current, sectorHref }: { current: Page; sectorHref?: string }) {
  return (
    <Header
      items={[
        { label: "Peringkat", icon: <HomeIcon />, href: "/", current: current === "board" },
        { label: "Sektor", icon: <GridIcon />, href: sectorHref ?? "/sector/industrials", current: current === "sector" },
        { label: "Metodologi", icon: <BookIcon />, href: "/methodology", current: current === "methodology", divider: true },
      ]}
      cta={{ label: "Cara membaca skor", href: "/methodology#rumus" }}
    />
  );
}
