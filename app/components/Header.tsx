"use client";

import type { View } from "../lib/model";

const NAV: [View, string][] = [
  ["board", "BOARD"],
  ["detail", "SECTOR"],
  ["methodology", "METHODOLOGY"],
];

export default function Header({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 24,
        padding: "14px 28px",
        borderBottom: "1px solid #24211d",
        position: "sticky",
        top: 0,
        background: "#0c0b0a",
        zIndex: 5,
        flexWrap: "wrap",
      }}
    >
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("board");
        }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.22em",
          color: "#e8e5e0",
        }}
      >
        DIVERGENCE
      </a>
      <div style={{ width: 1, height: 14, background: "#2c2824" }} />
      <nav style={{ display: "flex", gap: 20 }}>
        {NAV.map(([key, label]) => (
          <a
            key={key}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(key);
            }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: "0.14em",
              color: view === key ? "#e8e5e0" : "#7d776f",
              borderBottom: `1px solid ${view === key ? "#d19a3f" : "transparent"}`,
              paddingBottom: 3,
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a847c" }}>
        DATA 15 SEP 2026
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "#d19a3f",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#d19a3f",
            display: "inline-block",
          }}
        />
        Updated 10:04 WIB
      </div>
    </header>
  );
}
