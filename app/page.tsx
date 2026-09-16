"use client";

import { useState } from "react";
import BoardView from "./components/BoardView";
import DetailView from "./components/DetailView";
import Header from "./components/Header";
import MethodologyView from "./components/MethodologyView";
import type { View } from "./lib/model";

export default function Page() {
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
    <div
      style={{
        background: "#0c0b0a",
        color: "#e8e5e0",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        minHeight: "100vh",
        fontFeatureSettings: "'tnum'",
      }}
    >
      <Header view={view} onNavigate={go} />
      {view === "board" && <BoardView onOpenSector={openSector} />}
      {/* Keyed by slug so the picked emiten resets when the trader switches sector. */}
      {view === "detail" && <DetailView key={slug} slug={slug} onBack={() => go("board")} />}
      {view === "methodology" && <MethodologyView />}
    </div>
  );
}
