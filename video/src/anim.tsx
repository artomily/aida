import type { CSSProperties, ReactNode } from "react";
import { Easing, Html5Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.2, 0.75, 0.28, 1);

/** 0 → 1 spring that starts at `delay` frames. */
export function useSpring(delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120, mass: 0.8, ...config } });
}

/** Linear-eased progress between two frames. */
export function useProgress(from: number, to: number, easing = easeOut) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], { ...clamp, easing });
}

/** Rise-and-fade entrance for any element. */
export function Enter({
  delay = 0,
  y = 40,
  x = 0,
  scale = 1,
  blur = 8,
  children,
  style,
}: {
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
  blur?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const p = useSpring(delay);
  const t = Math.min(1, p);
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 0.6], [0, 1], clamp),
        transform: `translate(${(1 - p) * x}px, ${(1 - p) * y}px) scale(${scale + (1 - scale) * p})`,
        filter: blur ? `blur(${(1 - t) * blur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Wraps a scene: fades and lifts in, then eases out over its last frames. */
export function Scene({ children, exit = 14, enter = 10 }: { children: ReactNode; exit?: number; enter?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = interpolate(frame, [0, enter], [0, 1], { ...clamp, easing: easeOut });
  const outP = interpolate(frame, [durationInFrames - exit, durationInFrames], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: inP * (1 - outP),
        transform: `scale(${1 + 0.015 * (1 - inP) - 0.03 * outP})`,
        filter: `blur(${outP * 10}px)`,
      }}
    >
      {children}
    </div>
  );
}

export type SfxName =
  | "whoosh" | "swish" | "pop" | "tick" | "type" | "impact" | "riser"
  | "chime" | "ding" | "check" | "miss" | "glitch";

export function Sfx({ name, at, volume = 0.6 }: { name: SfxName; at: number; volume?: number }) {
  return (
    <Sequence from={Math.round(at)} layout="none" name={`sfx:${name}`}>
      <Html5Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
    </Sequence>
  );
}

/** Text revealed character by character, with a blinking caret while typing. */
export function Typewriter({ text, from, cps = 1.4, caret = true }: { text: string; from: number; cps?: number; caret?: boolean }) {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - from) * cps)));
  const typing = n < text.length && frame >= from;
  return (
    <span>
      {text.slice(0, n)}
      {caret && (typing || (frame >= from && Math.floor(frame / 12) % 2 === 0)) ? (
        <span style={{ opacity: 0.6, marginLeft: 2 }}>|</span>
      ) : null}
    </span>
  );
}

/** Frames at which a typewriter emits a key click, for syncing the "type" sfx. */
export function typeClicks(text: string, from: number, cps = 1.4, every = 3) {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += every) if (text[i] !== " ") out.push(from + i / cps);
  return out;
}
