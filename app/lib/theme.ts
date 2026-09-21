/** Shared by the head script (server) and the switch (client) — keep this module free of "use client". */
export type Theme = "light" | "dark";
export const THEME_KEY = "theme";
export const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before first paint: a stored choice wins, otherwise the OS preference.
 * Always writes `data-theme`, so the CSS only needs one dark selector.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${SYSTEM_DARK}").matches?"dark":"light";d.dataset.theme=t}catch(e){d.dataset.theme="light"}})()`;
