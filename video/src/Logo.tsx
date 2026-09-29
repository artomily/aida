import { interpolate, useCurrentFrame } from "remotion";
import { clamp, easeOut, useSpring } from "./anim";
import { day, fontFamily } from "./theme";

/**
 * The mark: one path that splits in two — above the model (blue) and below it (terracotta),
 * the same residual polarity the dashboard uses.
 */
export function Mark({ size = 120, delay = 0, color = day.ink }: { size?: number; delay?: number; color?: string }) {
  const frame = useCurrentFrame();
  const stem = interpolate(frame, [delay, delay + 14], [0, 1], { ...clamp, easing: easeOut });
  const branch = interpolate(frame, [delay + 10, delay + 30], [0, 1], { ...clamp, easing: easeOut });
  const dot = useSpring(delay + 24, { damping: 10, stiffness: 180 });
  const up = "M 60 60 C 80 60, 88 22, 112 22";
  const down = "M 60 60 C 80 60, 88 98, 112 98";
  return (
    <svg width={size} height={size} viewBox="0 0 124 120" style={{ overflow: "visible" }}>
      <path d="M 8 60 L 60 60" stroke={color} strokeWidth={9} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - stem} />
      <path d={up} stroke={day.pos} strokeWidth={9} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - branch} />
      <path d={down} stroke={day.neg} strokeWidth={9} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - branch} />
      <circle cx={112} cy={22} r={9 * dot} fill={day.pos} />
      <circle cx={112} cy={98} r={9 * dot} fill={day.neg} />
    </svg>
  );
}

/** "Aida", letter by letter. */
export function Wordmark({ delay = 0, size = 150, color = day.ink }: { delay?: number; size?: number; color?: string }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", fontFamily, fontSize: size, fontWeight: 640, letterSpacing: "-0.045em", color, lineHeight: 1 }}>
      {"Aida".split("").map((ch, i) => {
        const p = interpolate(frame, [delay + i * 2, delay + i * 2 + 16], [0, 1], { ...clamp, easing: easeOut });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 0.35}em) rotate(${(1 - p) * 8}deg)`,
              filter: `blur(${(1 - p) * 10}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}
