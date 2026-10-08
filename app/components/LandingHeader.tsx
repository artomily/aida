"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "../lib/auth-actions";
import { BrandMark } from "./ui";

const NAV = [
  { label: "Beranda", href: "/", current: true },
  { label: "Peringkat", href: "/dashboard" },
  { label: "Sektor", href: "/sector/industrials" },
  { label: "Metodologi", href: "/methodology" },
];

/**
 * Landing header. On tablet/phone the nav, snapshot panel and action collapse into a glass
 * dropdown: Escape, an outside pointer or a link click closes it; opening focuses the first link.
 */
export default function LandingHeader({ stamp, account }: { stamp: string; account: { name: string } | null }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // The toggle is only visible in the tablet/phone layouts; mirror that so `inert` only applies there.
  useEffect(() => {
    const el = toggle.current;
    if (!el) return;
    const sync = () => {
      const hidden = getComputedStyle(el).display === "none";
      setCollapsed(!hidden);
      if (hidden) setOpen(false);
    };
    sync();
    addEventListener("resize", sync);
    return () => removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header ref={header} className={`vt-header${open ? " menu-open" : ""}`}>
      <Link className="vt-brand" href="/" aria-label="Beranda Aida">
        <BrandMark />
        <b>Aida</b>
      </Link>

      <div ref={panel} className="vt-header-actions" id="tablet-navigation" inert={collapsed && !open}>
        <nav className="vt-nav" aria-label="Utama">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className={n.current ? "is-active" : undefined}
              aria-current={n.current ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="vt-time-panel">
          <span className="vt-time-label">Snapshot</span>
          <span className="vt-time-value">{stamp}</span>
        </div>
        {account ? (
          <form action={logout} className="vt-account" title={`Masuk sebagai ${account.name}`}>
            <span title={account.name}>{account.name}</span>
            <button type="submit">Keluar</button>
          </form>
        ) : (
          <Link className="vt-account" href="/login" onClick={() => setOpen(false)}>
            Masuk
          </Link>
        )}
        <Link className="vt-sign-up" href="/dashboard" onClick={() => setOpen(false)}>
          Dashboard
        </Link>
      </div>

      <button
        ref={toggle}
        className="vt-menu-toggle"
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        aria-controls="tablet-navigation"
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path className="vt-bar-a" d="M3 7h14" />
          <path className="vt-bar-b" d="M3 13h14" />
        </svg>
      </button>
    </header>
  );
}
