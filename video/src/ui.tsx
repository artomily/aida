import type { CSSProperties, ReactNode } from "react";
import { day, night } from "./theme";

export function Glass({ children, dark = false, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  const t = dark ? night : day;
  return (
    <div
      style={{
        background: t.glass,
        border: `1px solid ${t.glassLine}`,
        borderRadius: 28,
        boxShadow: t.shadow,
        backdropFilter: "blur(18px) saturate(1.2)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, dark = false, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: dark ? night.accent : day.accent,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Chip({ children, tone = "info", style }: { children: ReactNode; tone?: "info" | "ok" | "bad" | "plain" | "night"; style?: CSSProperties }) {
  const tones = {
    info: [day.infoBg, day.info],
    ok: [day.okBg, day.ok],
    bad: [day.badBg, day.bad],
    plain: ["rgba(255,255,255,0.7)", day.label],
    night: ["rgba(126,164,214,0.14)", night.accent],
  } as const;
  const [bg, fg] = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: "6px 16px",
        fontSize: 20,
        fontWeight: 560,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
