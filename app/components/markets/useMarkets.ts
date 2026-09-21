"use client";

import { useEffect, useState } from "react";
import type { Exchange, Stock } from "../../lib/markets/types";

/** Matches the server's hourly sectors.app cache — polling faster only re-reads the same payload. */
export const POLL_MS = 60 * 60_000;

/**
 * Fetch JSON and re-poll every `pollMs` while the tab is visible. Keeps the last good payload
 * on a failed refresh, so a blip never blanks a panel.
 */
export function usePolling<T>(url: string | null, pollMs: number) {
  const [state, setState] = useState<{ data: T | null; error: string | null; at: number | null; url: string | null }>({
    data: null,
    error: null,
    at: null,
    url: null,
  });

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as T;
        if (alive) setState({ data, error: null, at: Date.now(), url });
      } catch (e) {
        if (alive && !ctrl.signal.aborted)
          setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Gagal memuat", url }));
      }
    };
    load();
    const id = setInterval(() => !document.hidden && load(), pollMs);
    const onVis = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      ctrl.abort();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [url, pollMs]);

  // A payload from a previous URL is stale for this one — report loading instead.
  const fresh = state.url === url;
  return { data: fresh ? state.data : null, error: fresh ? state.error : null, at: fresh ? state.at : null };
}

/* ── formatting ── */

const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const sgd = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

export const fmtPrice = (s: Stock) =>
  s.price == null ? "—" : s.exchange === "IDX" ? "Rp " + idr.format(s.price) : "S$ " + sgd.format(s.price);

export const fmtChange = (v: number | null, digits = 2) =>
  v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(digits).replace(".", ",") + "%";

export const bare = (symbol: string) => symbol.replace(/\.(JK|SI)$/i, "");

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

export const EXCHANGE_LABEL: Record<Exchange, { short: string; long: string; flag: string }> = {
  SGX: { short: "SGX", long: "Singapura", flag: "🇸🇬" },
  IDX: { short: "IDX", long: "Indonesia", flag: "🇮🇩" },
};

/** Market-cap weighted mean change; equal weight when caps are missing (sample data). */
export function sectorStats(stocks: Stock[]) {
  const priced = stocks.filter((s) => s.change != null);
  const capped = priced.filter((s) => (s.marketCap ?? 0) > 0);
  const base = capped.length === priced.length && capped.length ? capped : priced;
  const w = base.map((s) => (base === capped ? s.marketCap! : 1));
  const total = w.reduce((a, b) => a + b, 0);
  const avg = total ? base.reduce((a, s, i) => a + s.change! * w[i], 0) / total : null;
  return {
    avg,
    up: priced.filter((s) => s.change! > 0).length,
    down: priced.filter((s) => s.change! < 0).length,
    count: stocks.length,
  };
}
