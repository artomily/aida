"use client";

import { useEffect, useRef } from "react";

/** Ember ramp sampled from the hero loop: black → oxblood → ember → amber → cream. */
const RAMP = ["#160400", "#3d0d02", "#7a1d06", "#c2380d", "#ff5a1f", "#ff8f45", "#ffc477", "#ffe9c2"];

type Props = {
  className?: string;
  /** Cell width × height in CSS px — tall and narrow, like the hero's LED columns. */
  cell?: [number, number];
  gap?: number;
  /** 0–1: how much of the field glows. */
  heat?: number;
  /** Text burned brighter into the field (e.g. a wordmark). */
  word?: string;
  seed?: number;
};

const hash = (x: number, y: number, s: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

/**
 * Animated LED mosaic on a canvas. Draws ~12 fps only while on screen, and a single still frame
 * when the reader prefers reduced motion.
 */
export default function PixelField({ className, cell = [5, 12], gap = 1, heat = 1, word, seed = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [cw, ch] = cell;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let cols = 0;
    let rows = 0;
    let mask: Float32Array | null = null;
    let streak: Float32Array = new Float32Array(0);
    let raf = 0;
    let last = 0;
    let visible = false;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const layout = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / (cw + gap));
      rows = Math.ceil(height / (ch + gap));
      // Some columns burn hotter than their neighbours — the vertical streaking in the video.
      streak = new Float32Array(cols);
      for (let x = 0; x < cols; x++) streak[x] = 0.7 + hash(x, 0, seed) * 0.5;
      mask = null;
      // Not laid out yet (or hidden): the ResizeObserver will call back once it has a size.
      if (!cols || !rows) return;
      if (word) {
        const off = document.createElement("canvas");
        off.width = cols;
        off.height = rows;
        const o = off.getContext("2d");
        if (o) {
          // A grid cell is taller than it is wide, so stretch glyphs horizontally to look right on screen.
          const size = rows * 0.92;
          o.font = `700 ${size}px ${getComputedStyle(canvas).getPropertyValue("--font-sans") || "sans-serif"}, sans-serif`;
          const stretch = (ch + gap) / (cw + gap);
          const w = o.measureText(word).width * stretch;
          const fit = Math.min(1, (cols * 0.94) / w);
          o.save();
          o.translate(cols / 2, rows / 2);
          o.scale(fit * stretch, fit);
          o.textAlign = "center";
          o.textBaseline = "middle";
          o.fillStyle = "#fff";
          o.fillText(word, 0, size * 0.04);
          o.restore();
          const data = o.getImageData(0, 0, cols, rows).data;
          mask = new Float32Array(cols * rows);
          for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] / 255;
        }
      }
    };

    const draw = (t: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      const s = t / 1000;
      // Three slow embers drifting through the field.
      const blobs = [
        { x: 0.32 + Math.sin(s * 0.21 + seed) * 0.18, y: 0.55 + Math.cos(s * 0.17) * 0.25, r: 0.34, a: 1 },
        { x: 0.7 + Math.cos(s * 0.15 + seed * 2) * 0.2, y: 0.4 + Math.sin(s * 0.23) * 0.3, r: 0.28, a: 0.85 },
        { x: 0.5 + Math.sin(s * 0.11 + 4) * 0.35, y: 0.6 + Math.sin(s * 0.19 + seed) * 0.3, r: 0.22, a: 0.6 },
      ];
      const aspect = width / Math.max(height, 1);
      for (let y = 0; y < rows; y++) {
        const ny = (y + 0.5) / rows;
        for (let x = 0; x < cols; x++) {
          const nx = (x + 0.5) / cols;
          let v = 0;
          for (const b of blobs) {
            const dx = (nx - b.x) * aspect;
            const dy = ny - b.y;
            v += b.a * Math.exp(-(dx * dx + dy * dy) / (b.r * b.r));
          }
          v *= heat * streak[x];
          const flicker = hash(x, y, Math.floor(s * 6) + seed);
          v += (flicker - 0.5) * 0.12;
          if (mask) v = v * 0.45 + mask[y * cols + x] * (0.75 + flicker * 0.25);
          const level = Math.floor(Math.min(0.999, Math.max(0, v)) * RAMP.length);
          if (level === 0 && flicker < 0.9) continue;
          ctx.fillStyle = RAMP[level];
          ctx.fillRect(x * (cw + gap), y * (ch + gap), cw, ch);
        }
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 80) return;
      last = t;
      draw(t);
    };

    const start = () => {
      if (still) return draw(4000);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    layout();
    draw(4000);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      layout();
      draw(last || 4000);
    });
    ro.observe(canvas);
    // The wordmark is rasterised from the web font; redo it once that font has arrived.
    if (word) document.fonts.ready.then(() => {
      layout();
      draw(last || 4000);
    });
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
    };
  }, [cw, ch, gap, heat, word, seed]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
