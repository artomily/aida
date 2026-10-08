/** Pixel-art pieces for the landing page — server-safe, no state. Styling lives in app/landing.css (`px-*`). */
import type { CSSProperties } from "react";

/** 9×9 bitmaps: `#` is a lit pixel. */
const ICONS = {
  link: [".........", ".###.....", ".#.#.....", ".###.....", "...#.....", "....#....", ".....###.", ".....#.#.", ".....###."],
  pulse: [".........", "...#.....", "...#.....", "..#.#....", "##..#..##", "....#.#..", "....#.#..", ".....#...", "........."],
  flow: ["..#......", ".###.....", "#.#.#....", "..#......", "..#...#..", "..#...#..", "....#.#.#", ".....###.", "......#.."],
  bolt: [".....##..", "....##...", "...##....", "..#####..", "....##...", "...##....", "..##.....", ".##......", "........."],
  target: ["..#####..", ".#.....#.", "#..###..#", "#.#...#.#", "#.#.#.#.#", "#.#...#.#", "#..###..#", ".#.....#.", "..#####.."],
  warn: ["....#....", "...###...", "...#.#...", "..##.##..", "..##.##..", ".###.###.", ".#######.", "####.####", "#########"],
  clock: ["..#####..", ".#.....#.", "#...#...#", "#...#...#", "#...###.#", "#.......#", "#.......#", ".#.....#.", "..#####.."],
  up: ["....#....", "...###...", "..#####..", ".###.###.", "....#....", "....#....", "....#....", "....#....", "........."],
  down: [".........", "....#....", "....#....", "....#....", "....#....", ".###.###.", "..#####..", "...###...", "....#...."],
  dot: [".........", ".........", "...###...", "..#####..", "..#####..", "..#####..", "...###...", ".........", "........."],
} as const;

export type PixelIconName = keyof typeof ICONS;

export function PixelIcon({ name, className = "" }: { name: PixelIconName; className?: string }) {
  const rows = ICONS[name];
  return (
    <svg className={`px-icon ${className}`} viewBox="0 0 9 9" aria-hidden="true" shapeRendering="crispEdges">
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)),
      )}
    </svg>
  );
}

/** LED segment bar: `value` of `max`, lit segments warm up toward the end. */
export function SegBar({ value, max, segments = 16, label }: { value: number; max: number; segments?: number; label?: string }) {
  const lit = Math.round(Math.max(0, Math.min(1, value / max)) * segments);
  return (
    <span className="px-seg" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {Array.from({ length: segments }, (_, i) => (
        <i key={i} data-on={i < lit || undefined} style={{ "--i": i / Math.max(1, segments - 1) } as CSSProperties} />
      ))}
    </span>
  );
}

/** Quantise 0–1 into the 0–6 heat levels the CSS paints. */
export const heatLevel = (v: number) => (v <= 0.005 ? 0 : Math.min(6, 1 + Math.floor(Math.min(1, v) * 6)));
