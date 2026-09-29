import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { Enter, Scene, Sfx, clamp, easeOut, useSpring } from "../anim";
import type { SceneProps } from "../Teaser";
import { night } from "../theme";
import { Eyebrow, Glass } from "../ui";

const NEWS = [
  { tag: "Profit warning", tone: night.neg, time: "07:12", title: "Grup perkebunan di SGX pangkas proyeksi laba" },
  { tag: "Divestasi", tone: night.accent, time: "07:35", title: "Induk usaha SGX lepas saham anak usaha di Indonesia" },
  { tag: "Akuisisi", tone: "#6fd49c", time: "07:58", title: "REIT SGX akuisisi aset ritel di Jakarta" },
];

const DRAW_FROM = 40;
const DRAW_TO = 150;
const MOVE_AT = 0.68; // share of the session before IDX prices react

// Deterministic "sector index" path: drifts, then reprices hours after the news.
const N = 80;
const SERIES = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1);
  const drift = (random(`p${i}`) - 0.5) * 0.08 + Math.sin(i / 5) * 0.03;
  const move = t < MOVE_AT ? 0 : -0.72 * (1 - Math.exp(-(t - MOVE_AT) * 22));
  return drift + move;
});

function Chart() {
  const frame = useCurrentFrame();
  const W = 760;
  const H = 360;
  const p = interpolate(frame, [DRAW_FROM, DRAW_TO], [0, 1], { ...clamp, easing: (t) => t });
  const n = Math.max(2, Math.floor(p * N));
  const x = (i: number) => (i / (N - 1)) * W;
  const y = (v: number) => H * 0.38 - v * H * 0.6;
  const d = SERIES.slice(0, n).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const hours = p * 4; // 08:00 → 12:00
  const delayMin = Math.floor(hours * 60);
  const moved = p >= MOVE_AT + 0.04;
  const late = useSpring(DRAW_FROM + (DRAW_TO - DRAW_FROM) * (MOVE_AT + 0.06), { damping: 9, stiffness: 180 });
  const last = SERIES[n - 1];
  return (
    <Glass dark style={{ width: W + 100, padding: "36px 50px 30px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 30, fontWeight: 600, color: night.ink }}>Sektor terkait · IDX</div>
        <div style={{ fontSize: 44, fontWeight: 650, color: moved ? night.neg : night.ink, fontVariantNumeric: "tabular-nums" }}>
          +{Math.floor(delayMin / 60)}j {String(delayMin % 60).padStart(2, "0")}m
        </div>
      </div>
      <div style={{ fontSize: 22, color: night.muted, marginTop: 4 }}>sejak kabar terakhir dirilis</div>
      <svg width={W} height={H} style={{ marginTop: 20, overflow: "visible" }}>
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke={night.glassLine} strokeDasharray="4 8" />
        <line x1={x(MOVE_AT * (N - 1))} x2={x(MOVE_AT * (N - 1))} y1={0} y2={H} stroke={night.neg} strokeOpacity={0.5 * Math.min(1, late)} strokeDasharray="3 6" />
        <path d={d} stroke={moved ? night.neg : night.accent} strokeWidth={5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n - 1)} cy={y(last)} r={10} fill={moved ? night.neg : night.accent} />
        <circle cx={x(n - 1)} cy={y(last)} r={10 + (frame % 20)} fill="none" stroke={moved ? night.neg : night.accent} strokeOpacity={1 - (frame % 20) / 20} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: night.muted, marginTop: 8 }}>
        {["09:00", "10:00", "11:00", "12:00", "13:00"].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 380,
          fontSize: 46,
          fontWeight: 700,
          color: night.neg,
          transform: `scale(${late}) rotate(${(1 - Math.min(1, late)) * -8}deg)`,
          transformOrigin: "left center",
          letterSpacing: "-0.02em",
        }}
      >
        Baru bereaksi.
      </div>
    </Glass>
  );
}

export function Problem(_: SceneProps) {
  const frame = useCurrentFrame();
  const moveFrame = DRAW_FROM + (DRAW_TO - DRAW_FROM) * MOVE_AT;
  // A signal pulse that crawls from the news to the chart — slowly.
  const travel = interpolate(frame, [48, moveFrame], [0, 1], { ...clamp, easing: easeOut });
  return (
    <Scene>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 120, marginTop: -40 }}>
        <div style={{ width: 640 }}>
          <Enter delay={2} y={-16}>
            <Eyebrow dark>Kabar dari Singapura</Eyebrow>
          </Enter>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 30 }}>
            {NEWS.map((n, i) => (
              <Enter key={n.tag} delay={12 + i * 11} x={-120} y={0} scale={0.92}>
                <Glass dark style={{ padding: "26px 32px", borderLeft: `6px solid ${n.tone}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 600 }}>
                    <span style={{ color: n.tone, textTransform: "uppercase", letterSpacing: "0.12em" }}>{n.tag}</span>
                    <span style={{ color: night.muted, fontVariantNumeric: "tabular-nums" }}>{n.time} WIB</span>
                  </div>
                  <div style={{ fontSize: 32, color: night.ink, marginTop: 10, lineHeight: 1.25, fontWeight: 500 }}>{n.title}</div>
                </Glass>
              </Enter>
            ))}
          </div>
          <Enter delay={50} y={10}>
            <div style={{ fontSize: 20, color: night.muted, marginTop: 18 }}>Contoh ilustrasi</div>
          </Enter>
        </div>
        <div style={{ position: "relative" }}>
          <Enter delay={6} y={-16}>
            <Eyebrow dark style={{ marginBottom: 30 }}>
              Reaksi di Jakarta
            </Eyebrow>
          </Enter>
          <Enter delay={20} x={120} y={0} scale={0.94}>
            <Chart />
          </Enter>
        </div>
      </AbsoluteFill>
      {/* the slow pulse between the two columns */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <line x1={900} y1={520} x2={1000} y2={520} stroke={night.glassLine} strokeWidth={3} strokeDasharray="6 10" opacity={interpolate(frame, [40, 50], [0, 1], clamp)} />
        <circle cx={900 + 100 * travel} cy={520} r={9} fill={night.accent} opacity={travel > 0 && travel < 1 ? 1 : 0} />
      </svg>
      {NEWS.map((_, i) => (
        <Sfx key={i} name="pop" at={14 + i * 11} volume={0.5} />
      ))}
      <Sfx name="whoosh" at={18} volume={0.4} />
      <Sfx name="glitch" at={moveFrame} volume={0.5} />
      <Sfx name="miss" at={moveFrame + 6} volume={0.55} />
    </Scene>
  );
}
