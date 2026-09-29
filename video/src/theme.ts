import { loadFont } from "@remotion/google-fonts/Inter";

export const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

/** Tokens mirror app/globals.css so the teaser reads as the same product. */
export const day = {
  ink: "#020c21",
  inkSoft: "#0f182f",
  muted: "#59627e",
  label: "#39455f",
  frame: "#e6edf6",
  accent: "#4a78b0",
  track: "#dde4ee",
  trackFill: "#5f88b4",
  hair: "#ced5e0",
  pos: "#3a6aa8",
  neg: "#b24a33",
  ok: "#1f6b43",
  okBg: "#e6f4ec",
  badBg: "#fde8e6",
  bad: "#9b2f22",
  infoBg: "#e3ecf8",
  info: "#264f86",
  glass: "rgba(255,255,255,0.62)",
  glassLine: "rgba(120,145,180,0.35)",
  shadow: "0 30px 80px -30px rgba(28,52,92,0.35), 0 2px 6px rgba(28,52,92,0.06)",
};

export const night = {
  ink: "#e6ecf5",
  inkSoft: "#cfd8e6",
  muted: "#9aa6bd",
  frame: "#0a1424",
  deep: "#050b17",
  accent: "#7ea4d6",
  track: "#1d2b42",
  pos: "#74a1dc",
  neg: "#e0795f",
  glass: "rgba(22,34,56,0.62)",
  glassLine: "rgba(120,145,185,0.28)",
  shadow: "0 30px 80px -30px rgba(0,0,0,0.7)",
};
