"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";
import { BrandMark, Cta } from "./ui";

export type NavItem = {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  current?: boolean;
  /** Draw the hairline divider before this item. */
  divider?: boolean;
};

/**
 * Brand · centred glass nav pill · dark CTA. Collapses to a burger under 900px with the
 * landing hero's contract: outside click, Escape, or widening the frame closes it.
 */
export default function Header({
  items,
  cta,
  onBrand,
}: {
  items: NavItem[];
  cta: { label: string; href?: string; onClick?: () => void };
  onBrand?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !burger.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      burger.current?.focus();
    };
    const wide = matchMedia("(min-width: 901px)");
    const onWide = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const run = (fn?: () => void) => {
    setOpen(false);
    fn?.();
  };

  return (
    <header className="ds-header ds-enter">
      <Link
        className="ds-brand"
        href="/"
        onClick={(e) => {
          if (!onBrand) return;
          e.preventDefault();
          run(onBrand);
        }}
      >
        <BrandMark />
        <b>Divergence</b>
      </Link>

      <button
        ref={burger}
        className="ds-burger ds-pill"
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <i />
        <i />
      </button>

      <div ref={menu} id="site-menu" className="ds-menu ds-pill" data-open={open || undefined}>
        <nav className="ds-nav ds-pill" aria-label="Utama">
          {items.map((n) => (
            <span key={n.label} style={{ display: "contents" }}>
              {n.divider && <hr />}
              <a
                href={n.href ?? "#"}
                aria-current={n.current ? "page" : undefined}
                onClick={(e) => {
                  if (n.onClick) e.preventDefault();
                  run(n.onClick);
                }}
              >
                {n.icon}
                {n.label}
              </a>
            </span>
          ))}
        </nav>

        <div className="ds-header-end">
          <ThemeToggle />
          <Cta href={cta.href} onClick={cta.onClick ? () => run(cta.onClick) : () => setOpen(false)} passthrough={!cta.onClick}>
            {cta.label}
          </Cta>
        </div>
      </div>
    </header>
  );
}
