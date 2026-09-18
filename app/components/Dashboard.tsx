"use client";

import { useState } from "react";
import BoardView from "./BoardView";
import DetailView from "./DetailView";
import Header from "./Header";
import MethodologyView from "./MethodologyView";
import { BookIcon, GridIcon, HomeIcon } from "./ui";
import type { View } from "../lib/model";

export default function Dashboard() {
  const [view, setView] = useState<View>("board");
  const [slug, setSlug] = useState<string | null>(null);

  const go = (next: View) => {
    setView(next);
    window.scrollTo(0, 0);
  };

  const openSector = (nextSlug: string) => {
    setSlug(nextSlug);
    go("detail");
  };

  return (
    <>
      <div className="ds-plate" aria-hidden="true" />
      <div className="ds-shell">
        <Header
          items={[
            { label: "Ringkasan", icon: <HomeIcon />, onClick: () => go("board"), current: view === "board" },
            { label: "Sektor", icon: <GridIcon />, onClick: () => go("detail"), current: view === "detail" },
            {
              label: "Cara kerja",
              icon: <BookIcon />,
              onClick: () => go("methodology"),
              current: view === "methodology",
              divider: true,
            },
          ]}
          cta={{ label: "Lihat yang tidak biasa", onClick: () => go("detail") }}
        />
        <main key={view === "detail" ? `detail-${slug}` : view}>
          {view === "board" && <BoardView onOpenSector={openSector} onNavigate={go} />}
          {/* Keyed by slug so the picked emiten resets when the reader switches sector. */}
          {view === "detail" && (
            <DetailView key={slug} slug={slug} onBack={() => go("board")} onOpenSector={openSector} />
          )}
          {view === "methodology" && <MethodologyView onNavigate={go} />}
        </main>
      </div>
    </>
  );
}
