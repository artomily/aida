import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Enter, Scene, Sfx, clamp, easeOut, useSpring } from "../anim";
import type { SceneProps } from "../Teaser";
import { night } from "../theme";
import { Eyebrow, Glass } from "../ui";

const SGX_OPEN = 70; // frame the clock reaches 08:00 WIB
const IDX_OPEN = 112; // …and 09:00 WIB

/** Wall-clock minutes (WIB) shown at a frame. */
function minutesAt(f: number) {
  if (f < SGX_OPEN) return interpolate(f, [18, SGX_OPEN], [7 * 60, 8 * 60], { ...clamp, easing: easeOut });
  return interpolate(f, [SGX_OPEN + 6, IDX_OPEN], [8 * 60, 9 * 60], { ...clamp, easing: easeOut });
}
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;

function Clock() {
  const frame = useCurrentFrame();
  const m = minutesAt(frame);
  const p = useSpring(6, { damping: 14 });
  const hourDeg = ((m / 60) % 12) * 30;
  const minDeg = (m % 60) * 6;
  const R = 170;
  return (
    <div style={{ transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -30}deg)`, opacity: Math.min(1, p * 1.5), textAlign: "center" }}>
      <svg width={R * 2 + 20} height={R * 2 + 20} viewBox={`${-R - 10} ${-R - 10} ${R * 2 + 20} ${R * 2 + 20}`}>
        <circle r={R} fill="rgba(22,34,56,0.7)" stroke={night.glassLine} strokeWidth={2} />
        <circle r={R - 16} fill="none" stroke="rgba(126,164,214,0.12)" strokeWidth={1} />
        {Array.from({ length: 60 }, (_, i) => {
          const big = i % 5 === 0;
          const a = (i * 6 * Math.PI) / 180;
          const show = interpolate(frame, [8 + i * 0.4, 14 + i * 0.4], [0, 1], clamp);
          return (
            <line
              key={i}
              x1={Math.sin(a) * (R - (big ? 30 : 22))}
              y1={-Math.cos(a) * (R - (big ? 30 : 22))}
              x2={Math.sin(a) * (R - 12)}
              y2={-Math.cos(a) * (R - 12)}
              stroke={big ? night.ink : night.muted}
              strokeWidth={big ? 4 : 1.5}
              strokeLinecap="round"
              opacity={show}
            />
          );
        })}
        <line x1={0} y1={14} x2={0} y2={-R * 0.52} stroke={night.ink} strokeWidth={10} strokeLinecap="round" transform={`rotate(${hourDeg})`} />
        <line x1={0} y1={20} x2={0} y2={-R * 0.78} stroke={night.accent} strokeWidth={6} strokeLinecap="round" transform={`rotate(${minDeg})`} />
        <circle r={10} fill={night.accent} />
      </svg>
      <div style={{ marginTop: 18, fontSize: 64, fontWeight: 600, color: night.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
        {hhmm(m)} <span style={{ fontSize: 30, color: night.muted, fontWeight: 500 }}>WIB</span>
      </div>
    </div>
  );
}

function Market({ code, city, openAt, openLabel, side }: { code: string; city: string; openAt: number; openLabel: string; side: -1 | 1 }) {
  const frame = useCurrentFrame();
  const open = frame >= openAt;
  const pop = useSpring(openAt, { damping: 9, stiffness: 200 });
  const glow = interpolate(frame, [openAt, openAt + 30], [1, 0], clamp);
  return (
    <Enter delay={10 + (side > 0 ? 4 : 0)} x={side * 260} y={0} blur={12}>
      <Glass
        dark
        style={{
          width: 400,
          padding: "40px 44px",
          transform: `scale(${open ? 1 + 0.06 * Math.sin(Math.min(1, pop) * Math.PI) : 1})`,
          boxShadow: open ? `0 0 ${80 * glow + 30}px rgba(126,164,214,${0.25 + 0.4 * glow}), ${night.shadow}` : night.shadow,
          borderColor: open ? "rgba(126,164,214,0.6)" : night.glassLine,
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700, color: night.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>{code}</div>
        <div style={{ fontSize: 30, color: night.muted, marginTop: 10 }}>{city}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 34, fontSize: 30, fontWeight: 560 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 99,
              background: open ? "#6fd49c" : night.muted,
              boxShadow: open ? `0 0 ${14 + 8 * Math.sin(frame / 4)}px #6fd49c` : "none",
            }}
          />
          <span style={{ color: open ? night.ink : night.muted }}>{open ? `Buka · ${openLabel}` : "Belum buka"}</span>
        </div>
      </Glass>
    </Enter>
  );
}

function Timeline() {
  const frame = useCurrentFrame();
  const W = 1200;
  const x = (min: number) => ((min - 7 * 60) / 180) * W;
  const draw = interpolate(frame, [20, 44], [0, 1], { ...clamp, easing: easeOut });
  const now = minutesAt(frame);
  const bracket = interpolate(frame, [IDX_OPEN + 4, IDX_OPEN + 26], [0, 1], { ...clamp, easing: easeOut });
  const label = useSpring(IDX_OPEN + 18, { damping: 10, stiffness: 160 });
  return (
    <div style={{ position: "absolute", left: (1920 - W) / 2, top: 800, width: W, height: 120 }}>
      {/* the "+1 jam" bracket */}
      <svg width={W} height={60} style={{ position: "absolute", top: -64, left: 0, overflow: "visible" }}>
        <path
          d={`M ${x(480)} 50 L ${x(480)} 20 L ${x(540)} 20 L ${x(540)} 50`}
          stroke={night.accent}
          strokeWidth={4}
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - bracket}
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: x(510),
          top: -128,
          transform: `translateX(-50%) scale(${label})`,
          fontSize: 50,
          fontWeight: 700,
          color: night.accent,
          whiteSpace: "nowrap",
          letterSpacing: "-0.02em",
        }}
      >
        +1 jam lebih dulu
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: W * draw, background: night.track, borderRadius: 8 }} />
      <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: Math.max(0, x(now)) * draw, background: night.accent, borderRadius: 8 }} />
      {[7, 8, 9, 10].map((h, i) => (
        <div
          key={h}
          style={{
            position: "absolute",
            left: x(h * 60),
            top: 24,
            transform: "translateX(-50%)",
            fontSize: 26,
            color: now >= h * 60 ? night.ink : night.muted,
            fontVariantNumeric: "tabular-nums",
            opacity: interpolate(frame, [22 + i * 5, 32 + i * 5], [0, 1], clamp),
          }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

export function Hook(_: SceneProps) {
  const ticks = Array.from({ length: 22 }, (_, i) => 20 + i * 4.3);
  return (
    <Scene>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <Enter delay={2} y={-20}>
          <Eyebrow dark>Pagi hari di Asia Tenggara</Eyebrow>
        </Enter>
      </AbsoluteFill>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 90, marginTop: -60 }}>
        <Market code="SGX" city="Singapura" openAt={SGX_OPEN} openLabel="08:00 WIB" side={-1} />
        <Clock />
        <Market code="IDX" city="Jakarta" openAt={IDX_OPEN} openLabel="09:00 WIB" side={1} />
      </AbsoluteFill>
      <Timeline />
      <Sfx name="whoosh" at={8} volume={0.55} />
      {ticks.map((t) => (
        <Sfx key={t} name="tick" at={t} volume={0.22} />
      ))}
      <Sfx name="ding" at={SGX_OPEN} volume={0.55} />
      <Sfx name="ding" at={IDX_OPEN} volume={0.45} />
      <Sfx name="swish" at={IDX_OPEN + 6} volume={0.4} />
      <Sfx name="pop" at={IDX_OPEN + 18} volume={0.5} />
    </Scene>
  );
}
