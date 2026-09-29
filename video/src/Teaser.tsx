import type { FC } from "react";
import { AbsoluteFill, Html5Audio, Sequence, interpolate, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { Sfx, clamp, easeOut } from "./anim";
import { Board } from "./scenes/Board";
import { Brand } from "./scenes/Brand";
import { Formula } from "./scenes/Formula";
import { Honest } from "./scenes/Honest";
import { Hook } from "./scenes/Hook";
import { Linkage } from "./scenes/Linkage";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { day, fontFamily, night } from "./theme";
import timeline from "./timeline.json";

export type Line = (typeof timeline.scenes)[number]["lines"][number];
export type SceneProps = { lines: Line[] };

const SCENES: Record<string, FC<SceneProps>> = {
  hook: Hook,
  problem: Problem,
  linkage: Linkage,
  brand: Brand,
  formula: Formula,
  board: Board,
  honest: Honest,
  outro: Outro,
};

const brandAt = timeline.scenes.find((s) => s.id === "brand")!.from;
/** The frame where night turns to day — the Aida reveal. */
export const DAWN = brandAt;

/** Absolute [start, end) of every voice line, for ducking and captions. */
const voice = timeline.scenes.flatMap((s) => s.lines.map((l) => ({ ...l, start: s.from + l.from, end: s.from + l.from + l.frames })));

function musicVolume(f: number) {
  // Distance to the nearest voice line, in frames; duck to 0.28 under speech with 8-frame ramps.
  let d = Infinity;
  for (const v of voice) d = Math.min(d, f < v.start ? v.start - f : f >= v.end ? f - v.end : 0);
  const duck = interpolate(d, [0, 8], [0.28, 1], clamp);
  const intro = interpolate(f, [0, 20], [0, 1], clamp);
  return 0.5 * duck * intro;
}

function Background() {
  const frame = useCurrentFrame();
  const dawn = interpolate(frame, [DAWN - 4, DAWN + 16], [0, 1], { ...clamp, easing: easeOut });
  const base = interpolateColors(dawn, [0, 1], [night.frame, day.frame]);
  // A slow-drifting glass orb, standing in for the dashboard's hero plate.
  const ox = 62 + Math.sin(frame / 90) * 6;
  const oy = 40 + Math.cos(frame / 110) * 5;
  const orbA = dawn ? `rgba(255,255,255,${0.9 * dawn})` : "transparent";
  return (
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${ox}% ${oy}%, rgba(74,120,176,${0.34 - 0.12 * dawn}) 0%, rgba(74,120,176,0) 38%),
            radial-gradient(circle at ${100 - ox}% ${100 - oy}%, rgba(126,164,214,${0.18}) 0%, rgba(126,164,214,0) 42%),
            radial-gradient(circle at ${ox - 4}% ${oy - 6}%, ${orbA} 0%, rgba(255,255,255,0) 22%)`,
        }}
      />
      {/* Hairline grid that drifts upward — reads as a trading screen without shouting. */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${dawn ? "rgba(120,145,180,0.14)" : "rgba(120,145,185,0.09)"} 1px, transparent 1px),
            linear-gradient(90deg, ${dawn ? "rgba(120,145,180,0.14)" : "rgba(120,145,185,0.09)"} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: `0 ${-frame * 0.4}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
        }}
      />
      {/* Dawn flash at the reveal. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,1) 0%, rgba(230,237,246,0.9) ${interpolate(frame, [DAWN - 2, DAWN + 14], [0, 90], clamp)}%, rgba(230,237,246,0) ${interpolate(frame, [DAWN - 2, DAWN + 14], [0, 140], clamp)}%)`,
          opacity: interpolate(frame, [DAWN - 2, DAWN + 2, DAWN + 22], [0, 1, 0], clamp),
        }}
      />
    </AbsoluteFill>
  );
}

function Captions() {
  const frame = useCurrentFrame();
  const line = voice.find((v) => frame >= v.start - 4 && frame < v.end + 10);
  if (!line) return null;
  const isDay = frame >= DAWN;
  const p = interpolate(frame, [line.start - 4, line.start + 6, line.end + 2, line.end + 10], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54 }}>
      <div
        style={{
          fontFamily,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: isDay ? day.inkSoft : night.ink,
          background: isDay ? "rgba(255,255,255,0.72)" : "rgba(5,11,23,0.62)",
          border: `1px solid ${isDay ? day.glassLine : night.glassLine}`,
          backdropFilter: "blur(14px)",
          padding: "14px 28px",
          borderRadius: 999,
          opacity: p,
          transform: `translateY(${(1 - p) * 14}px)`,
          maxWidth: 1500,
          textAlign: "center",
        }}
      >
        {line.text}
      </div>
    </AbsoluteFill>
  );
}

export function Teaser() {
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Background />
      {timeline.scenes.map((s, i) => {
        const Comp = SCENES[s.id];
        const last = i === timeline.scenes.length - 1;
        return (
          <Sequence key={s.id} name={s.id} from={s.from} durationInFrames={last ? timeline.total - s.from : s.frames}>
            <Comp lines={s.lines} />
            {s.lines.map((l) => (
              <Sequence key={l.file} from={l.from} layout="none" name={`vo:${l.text.slice(0, 24)}`}>
                <Html5Audio src={staticFile(l.file)} volume={1} />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
      <Html5Audio src={staticFile("audio/music.wav")} volume={musicVolume} />
      <Sfx name="riser" at={DAWN - 57} volume={0.5} />
      <Captions />
    </AbsoluteFill>
  );
}
