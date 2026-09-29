import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { Enter, Scene, Sfx, clamp, easeOut, useSpring } from "../anim";
import type { SceneProps } from "../Teaser";
import { day } from "../theme";
import { Glass } from "../ui";

const CARD_W = 330;
const CARD_H = 340;

function ExposureViz({ at }: { at: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220 }}>
      {[0.92, 0.64, 0.38].map((w, i) => {
        const p = interpolate(frame, [at + 6 + i * 5, at + 26 + i * 5], [0, w], { ...clamp, easing: easeOut });
        return (
          <div key={i} style={{ height: 16, background: day.track, borderRadius: 9 }}>
            <div style={{ width: `${p * 100}%`, height: "100%", background: day.trackFill, borderRadius: 9 }} />
          </div>
        );
      })}
    </div>
  );
}

function BetaViz({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [at + 18, at + 36], [0, 1], { ...clamp, easing: easeOut });
  return (
    <svg width={220} height={90}>
      {Array.from({ length: 16 }, (_, i) => {
        const x = 10 + (i / 15) * 200;
        const y = 80 - (i / 15) * 60 + (random(`b${i}`) - 0.5) * 30;
        const p = interpolate(frame, [at + 4 + i, at + 10 + i], [0, 1], clamp);
        return <circle key={i} cx={x} cy={y} r={5 * p} fill={day.accent} opacity={0.55} />;
      })}
      <line x1={10} y1={80} x2={10 + 200 * line} y2={80 - 60 * line} stroke={day.ink} strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

function FlowViz({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const vals = [0.5, -0.3, 0.8, 0.35, -0.6, 0.9, 0.2];
  return (
    <svg width={220} height={90}>
      <line x1={0} x2={220} y1={45} y2={45} stroke={day.hair} strokeWidth={2} />
      {vals.map((v, i) => {
        const p = interpolate(frame, [at + 4 + i * 2, at + 18 + i * 2], [0, 1], { ...clamp, easing: easeOut });
        const h = Math.abs(v) * 40 * p;
        return <rect key={i} x={8 + i * 30} y={v > 0 ? 45 - h : 45} width={20} height={h} rx={4} fill={v > 0 ? day.pos : day.neg} />;
      })}
    </svg>
  );
}

function TriggerViz({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const p = useSpring(at + 4, { damping: 9, stiffness: 180 });
  const ring = ((frame - at) % 30) / 30;
  return (
    <svg width={220} height={90} viewBox="0 0 220 90">
      <circle cx={110} cy={45} r={20 + ring * 30} fill="none" stroke={day.neg} strokeWidth={3} opacity={frame > at ? 1 - ring : 0} />
      <g transform={`translate(110 45) scale(${p})`}>
        <circle r={26} fill={day.neg} />
        <path d="M 3 -16 L -9 3 L 0 3 L -3 16 L 9 -3 L 0 -3 Z" fill="#fff" />
      </g>
    </svg>
  );
}

function Slot({ at, slotAt, name, kind, sub, viz }: { at: number; slotAt: number; name: string; kind: string; sub: string; viz: ReactNode }) {
  const frame = useCurrentFrame();
  const slot = interpolate(frame, [slotAt, slotAt + 10], [0, 1], clamp);
  const p = useSpring(at, { damping: 13, stiffness: 150 });
  const lit = frame >= at;
  return (
    <div style={{ position: "relative", width: CARD_W, height: CARD_H }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          border: `2.5px dashed ${day.hair}`,
          opacity: slot * (1 - Math.min(1, p)),
          transform: `scale(${0.9 + 0.1 * slot})`,
        }}
      />
      {lit && (
        <Glass
          style={{
            position: "absolute",
            inset: 0,
            padding: "30px 30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            opacity: Math.min(1, p * 1.5),
            transform: `translateY(${(1 - p) * 60}px) scale(${0.85 + 0.15 * p})`,
          }}
        >
          <div style={{ height: 96, display: "flex", alignItems: "center" }}>{viz}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: "0.18em", textTransform: "uppercase", color: day.accent }}>{kind}</div>
            <div style={{ fontSize: 46, fontWeight: 680, color: day.ink, letterSpacing: "-0.03em", marginTop: 6 }}>{name}</div>
            <div style={{ fontSize: 22, color: day.muted, marginTop: 8, lineHeight: 1.3 }}>{sub}</div>
          </div>
        </Glass>
      )}
    </div>
  );
}

function Op({ children, at, big = false }: { children: ReactNode; at: number; big?: boolean }) {
  const p = useSpring(at, { damping: 8, stiffness: 200 });
  return (
    <div
      style={{
        fontSize: big ? 84 : 110,
        fontWeight: 300,
        color: big ? day.muted : day.accent,
        width: big ? 34 : 70,
        textAlign: "center",
        transform: `scale(${p}) rotate(${(1 - Math.min(1, p)) * 90}deg)`,
        lineHeight: 1,
      }}
    >
      {children}
    </div>
  );
}

export function Formula({ lines }: SceneProps) {
  const frame = useCurrentFrame();
  const [intro, exp, sens, flow, trig] = lines.map((l) => l.from);
  const strike = interpolate(frame, [intro + 64, intro + 80], [0, 1], { ...clamp, easing: easeOut });
  const formulaAt = trig + 18;
  return (
    <Scene>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <div style={{ display: "flex", gap: 24, fontSize: 72, fontWeight: 700, letterSpacing: "-0.035em", color: day.ink }}>
          <Enter delay={intro} y={30}>
            Empat komponen.
          </Enter>
          <Enter delay={intro + 34} y={30}>
            <span style={{ color: day.accent }}>Dikalikan,</span>
          </Enter>
          <Enter delay={intro + 56} y={30}>
            <span style={{ position: "relative", color: day.muted, fontWeight: 500 }}>
              bukan dijumlah.
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "54%",
                  height: 6,
                  width: `${strike * 100}%`,
                  background: day.neg,
                  borderRadius: 4,
                }}
              />
            </span>
          </Enter>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 40 }}>
        <Slot slotAt={24} at={exp} name="Eksposur" kind="Struktural" sub="Kepemilikan & operasi SGX ↔ IDX" viz={<ExposureViz at={exp} />} />
        <Op at={intro + 38}>×</Op>
        <Slot slotAt={29} at={sens} name="Sensitivitas" kind="Historis" sub="β SGX → IDX, diuji tiap sektor" viz={<BetaViz at={sens} />} />
        <Op at={intro + 44}>×</Op>
        <Op at={intro + 50} big>
          (
        </Op>
        <Slot slotAt={34} at={flow} name="Flow" kind="Harian" sub="Transaksi orang dalam, 30 hari" viz={<FlowViz at={flow} />} />
        <Op at={intro + 50} big>
          +
        </Op>
        <Slot slotAt={39} at={trig} name="Pemicu" kind="Harian" sub="Berita SGX, berbasis aturan" viz={<TriggerViz at={trig} />} />
        <Op at={intro + 50} big>
          )
        </Op>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 170 }}>
        <Enter delay={formulaAt} y={20}>
          <div style={{ fontSize: 30, color: day.label, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "-0.01em" }}>
            Perhatian = Eksposur × (0,5 + Sensitivitas) × (1 + Flow + Pemicu)
          </div>
        </Enter>
      </AbsoluteFill>

      {[24, 29, 34, 39].map((t) => (
        <Sfx key={t} name="tick" at={t} volume={0.3} />
      ))}
      <Sfx name="pop" at={intro + 38} volume={0.45} />
      <Sfx name="pop" at={intro + 44} volume={0.45} />
      <Sfx name="swish" at={intro + 64} volume={0.4} />
      {[exp, sens, flow, trig].map((t, i) => (
        <Sfx key={`c${i}`} name="whoosh" at={t - 2} volume={0.35} />
      ))}
      {[exp, sens, flow, trig].map((t, i) => (
        <Sfx key={`p${i}`} name="pop" at={t + 6} volume={0.4} />
      ))}
      <Sfx name="chime" at={formulaAt} volume={0.3} />
    </Scene>
  );
}
