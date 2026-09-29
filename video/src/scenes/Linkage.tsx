import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Enter, Scene, Sfx, clamp, easeOut, useSpring } from "../anim";
import type { SceneProps } from "../Teaser";
import { night } from "../theme";
import { Eyebrow } from "../ui";

// From data/exposure_graph.yaml — SGX entities and the IDX emiten they structurally touch.
const SGX = [
  ["J36", "Jardine Matheson"],
  ["C07", "Jardine C&C"],
  ["O39", "OCBC"],
  ["Z74", "Singtel"],
  ["E5H", "Golden Agri"],
  ["5JS", "IndoAgri"],
  ["A26", "Sinarmas Land"],
  ["AW9U", "First REIT"],
  ["F34", "Wilmar"],
  ["EB5", "First Resources"],
  ["RE4", "Geo Energy"],
];
const IDX = [
  ["ASII", "Astra International"],
  ["UNTR", "United Tractors"],
  ["AALI", "Astra Agro Lestari"],
  ["NISP", "Bank OCBC NISP"],
  ["TLKM", "Telkom Indonesia"],
  ["SMAR", "SMART"],
  ["INDF", "Indofood"],
  ["SIMP", "Salim Ivomas"],
  ["BSDE", "Bumi Serpong Damai"],
  ["SILO", "Siloam"],
  ["ID", "Operasi langsung di Indonesia"],
];
const EDGES: [number, number][] = [
  [0, 0], [1, 0], [1, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [5, 7], [6, 8], [7, 9], [8, 10], [9, 10], [10, 10],
];
// Blue chips held by Singapore entities, called out on the second line.
const HIGHLIGHT = [
  { edge: 1, tag: "~50%" },
  { edge: 4, tag: "~85%" },
  { edge: 5, tag: "35% Telkomsel" },
];

const TOP = 300;
const STEP = 56;
const LX = 800; // right edge of the SGX pills
const RX = 1120; // left edge of the IDX pills
const yOf = (i: number) => TOP + i * STEP;

function Pill({ code, name, align, delay, hot, dim }: { code: string; name: string; align: "left" | "right"; delay: number; hot: boolean; dim: boolean }) {
  const p = useSpring(delay, { damping: 12, stiffness: 170 });
  const isHub = code === "ID";
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        [align === "right" ? "right" : "left"]: 0,
        height: 44,
        display: "flex",
        flexDirection: align === "right" ? "row-reverse" : "row",
        alignItems: "center",
        gap: 14,
        padding: "0 20px",
        borderRadius: 999,
        background: hot ? "rgba(126,164,214,0.24)" : "rgba(22,34,56,0.75)",
        border: `1.5px solid ${hot ? night.accent : night.glassLine}`,
        boxShadow: hot ? `0 0 30px rgba(126,164,214,0.45)` : "none",
        transform: `scale(${p}) translateX(${(1 - Math.min(1, p)) * (align === "right" ? -40 : 40)}px)`,
        transformOrigin: align === "right" ? "right center" : "left center",
        opacity: Math.min(1, p * 1.4) * (dim ? 0.38 : 1),
        whiteSpace: "nowrap",
      }}
    >
      {!isHub && <b style={{ fontSize: 24, color: night.ink, fontWeight: 700, letterSpacing: "0.02em" }}>{code}</b>}
      <span style={{ fontSize: 22, color: isHub ? night.accent : night.muted, fontWeight: isHub ? 600 : 450 }}>{name}</span>
    </div>
  );
}

export function Linkage({ lines }: SceneProps) {
  const frame = useCurrentFrame();
  const second = lines[1].from;
  const hotEdges = new Set(HIGHLIGHT.map((h) => h.edge));
  const focus = interpolate(frame, [second, second + 12], [0, 1], clamp);
  const count = Math.round(interpolate(frame, [18, 90], [0, 20], { ...clamp, easing: easeOut }));
  const headA = interpolate(frame, [second - 4, second + 8], [1, 0], clamp);
  const hotIdx = new Set(HIGHLIGHT.map((h) => EDGES[h.edge][1]));
  const hotSgx = new Set(HIGHLIGHT.map((h) => EDGES[h.edge][0]));

  return (
    <Scene>
      {/* headline: counts up, then hands over to the ownership line */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 96 }}>
        <div style={{ position: "relative", height: 150, width: 1600, textAlign: "center" }}>
          <div style={{ position: "absolute", inset: 0, opacity: headA, transform: `translateY(${(1 - headA) * -20}px)` }}>
            <Enter delay={4} y={30}>
              <div style={{ fontSize: 76, fontWeight: 700, color: night.ink, letterSpacing: "-0.035em" }}>
                <span style={{ color: night.accent, fontVariantNumeric: "tabular-nums" }}>{count}+</span> emiten SGX beroperasi di Indonesia
              </div>
            </Enter>
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - headA, transform: `translateY(${headA * 24}px)` }}>
            <div style={{ fontSize: 76, fontWeight: 700, color: night.ink, letterSpacing: "-0.035em" }}>
              Blue chip IDX, dimiliki <span style={{ color: night.accent }}>entitas Singapura</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", left: LX - 300, top: TOP - 70, width: 300, textAlign: "right" }}>
        <Enter delay={14} y={-10}>
          <Eyebrow dark>SGX</Eyebrow>
        </Enter>
      </div>
      <div style={{ position: "absolute", left: RX, top: TOP - 70 }}>
        <Enter delay={50} y={-10}>
          <Eyebrow dark>IDX</Eyebrow>
        </Enter>
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {EDGES.map(([a, b], k) => {
          const y1 = yOf(a) + 22;
          const y2 = yOf(b) + 22;
          const draw = interpolate(frame, [96 + k * 4, 118 + k * 4], [0, 1], { ...clamp, easing: easeOut });
          const hot = hotEdges.has(k);
          const op = hot ? 1 : 1 - 0.7 * focus;
          return (
            <path
              key={k}
              d={`M ${LX + 8} ${y1} C ${LX + 160} ${y1}, ${RX - 160} ${y2}, ${RX - 8} ${y2}`}
              stroke={hot && focus > 0 ? night.accent : "rgba(126,164,214,0.55)"}
              strokeWidth={hot ? 2.5 + 3 * focus : 2.5}
              fill="none"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - draw}
              opacity={op}
              style={{ filter: hot && focus > 0 ? `drop-shadow(0 0 ${10 * focus}px ${night.accent})` : undefined }}
            />
          );
        })}
        {/* packets running along the edges once they're drawn */}
        {EDGES.map(([a, b], k) => {
          const t = ((frame - 130 - k * 7) % 45) / 45;
          if (frame < 130 + k * 7 || t < 0) return null;
          const y1 = yOf(a) + 22;
          const y2 = yOf(b) + 22;
          const e = t * t * (3 - 2 * t);
          const x = LX + 8 + (RX - LX - 16) * t;
          const y = y1 + (y2 - y1) * e;
          return <circle key={k} cx={x} cy={y} r={4} fill={night.ink} opacity={(1 - focus * (hotEdges.has(k) ? 0 : 0.8)) * Math.sin(t * Math.PI)} />;
        })}
      </svg>

      {SGX.map(([code, name], i) => (
        <div key={code} style={{ position: "absolute", top: yOf(i), left: 0, width: LX }}>
          <Pill code={code} name={name} align="right" delay={20 + i * 4} hot={focus > 0 && hotSgx.has(i)} dim={focus > 0 && !hotSgx.has(i)} />
        </div>
      ))}
      {IDX.map(([code, name], i) => (
        <div key={code} style={{ position: "absolute", top: yOf(i), left: RX }}>
          <Pill code={code} name={name} align="left" delay={56 + i * 4} hot={focus > 0 && hotIdx.has(i)} dim={focus > 0 && !hotIdx.has(i)} />
        </div>
      ))}

      {HIGHLIGHT.map((h, j) => (
        <Tag key={h.tag} text={h.tag} at={second + 14 + j * 20} y={(yOf(EDGES[h.edge][0]) + yOf(EDGES[h.edge][1])) / 2 + 22} />
      ))}

      {SGX.map((_, i) => (i % 2 === 0 ? <Sfx key={`s${i}`} name="pop" at={20 + i * 4} volume={0.3} /> : null))}
      {IDX.map((_, i) => (i % 2 === 0 ? <Sfx key={`i${i}`} name="pop" at={56 + i * 4} volume={0.3} /> : null))}
      <Sfx name="whoosh" at={94} volume={0.45} />
      {Array.from({ length: 12 }, (_, i) => (
        <Sfx key={`t${i}`} name="type" at={20 + i * 6} volume={0.35} />
      ))}
      <Sfx name="swish" at={second - 2} volume={0.45} />
      {HIGHLIGHT.map((_, j) => (
        <Sfx key={`h${j}`} name="ding" at={second + 14 + j * 20} volume={0.35} />
      ))}
    </Scene>
  );
}

function Tag({ text, at, y }: { text: string; at: number; y: number }) {
  const p = useSpring(at, { damping: 10, stiffness: 180 });
  return (
    <div
      style={{
        position: "absolute",
        left: (LX + RX) / 2,
        top: y,
        transform: `translate(-50%, -50%) scale(${p})`,
        background: night.accent,
        color: night.deep,
        fontWeight: 700,
        fontSize: 22,
        padding: "6px 14px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}
