"use client";

import { useSyncExternalStore } from "react";
import { SYSTEM_DARK as SYSTEM, THEME_KEY as KEY, type Theme } from "../lib/theme";

const listeners = new Set<() => void>();
const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Follow the OS while the reader hasn't picked a side.
  const mq = matchMedia(SYSTEM);
  const onSystem = (e: MediaQueryListEvent) => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    if (stored !== "light" && stored !== "dark") apply(e.matches ? "dark" : "light");
  };
  mq.addEventListener("change", onSystem);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSystem);
  };
}

export default function ThemeToggle() {
  // null on the server: the head script decides, so render the switch unpressed until hydrated.
  const theme = useSyncExternalStore<Theme | null>(subscribe, read, () => null);
  const dark = theme === "dark";

  const toggle = () => {
    const next: Theme = dark ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Mode gelap"
      title={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className="ds-theme ds-pill"
      data-on={dark || undefined}
      onClick={toggle}
    >
      <svg className="ds-theme-sun" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="3.6" />
        <path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1M4.2 4.2l1.5 1.5M14.3 14.3l1.5 1.5M4.2 15.8l1.5-1.5M14.3 5.7l1.5-1.5" />
      </svg>
      <svg className="ds-theme-moon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M16.4 12.3A6.9 6.9 0 0 1 7.7 3.6a6.9 6.9 0 1 0 8.7 8.7z" />
      </svg>
      <i />
    </button>
  );
}
