import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Enter, Scene, Sfx, clamp, easeOut, useSpring } from "../anim";
import type { SceneProps } from "../Teaser";
import { day } from "../theme";
import { Chip, Eyebrow, Glass } from "../ui";

// Illustrative numbers — the teaser shows the board's shape, not a real snapshot.
const ROWS: { name: string; score: number; exp: number; flow: number; trig?: [string, "ok" | "bad" | "info"] }[] = [
  { name: "Konsumen Primer", score: 2.84, exp: 0.312, flow: 4, trig: ["Akuisisi", "ok"] },
  { name: "Perindustrian", score: 2.41, exp: 0.287, flow: 2, trig: ["Dividen", "ok"] },
  { name: "Keuangan", score: 1.97, exp: 0.104, flow: -3, trig: ["Regulasi", "info"] },
  { name: "Infrastruktur", score: 1.62, exp: 0.151, flow: 1 },
  { name: "Properti & Real Estat", score: 1.18, exp: 0.226, flow: -2, trig: ["Divestasi", "bad"] },
  { name: "Kesehatan", score: 0.94, exp: 0.118, flow: 0 },
  { name: "Energi", score: 0.71, exp: 0.064, flow: 2 },
  { name: "Barang Baku", score: 0.52, exp: 0.041, flow: -1 },
  { name: "Transportasi & Logistik", score: 0.33, exp: 0.058, flow: 0 },
  { name: "Konsumen Non-Primer", score: 0.21, exp: 0.022, flow: 1 },
  { name: "Teknologi", score: 0.08, exp: 0.004, flow: 0 },
];
const MAX = 4.5;
const ROW_AT = (i: number) => 34 + i * 5;
const HILITE = 132;

const COLS = "70px 400px 470px 190px 170px 200px";

function Row({ i }: { i: number }) {
  const frame = useCurrentFrame();
  const r = ROWS[i];
  const at = ROW_AT(i);
  const p = useSpring(at, { damping: 15, stiffness: 150 });
  const bar = interpolate(frame, [at + 6, at + 40], [0, r.score / MAX], { ...clamp, easing: easeOut });
  const hot = i === 0 ? interpolate(frame, [HILITE, HILITE + 10], [0, 1], clamp) : 0;
  const pill = useSpring(at + 20, { damping: 9, stiffness: 200 });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        alignItems: "center",
        height: 50,
        padding: "0 20px",
        borderRadius: 14,
        fontSize: 25,
        color: day.inkSoft,
        opacity: Math.min(1, p * 1.4),
        transform: `translateX(${(1 - p) * 90}px)`,
        background: hot ? `rgba(74,120,176,${0.12 * hot})` : "transparent",
        boxShadow: hot ? `inset 0 0 0 2px rgba(74,120,176,${0.5 * hot})` : "none",
        borderTop: i && !hot ? `1px solid rgba(206,213,224,0.7)` : "1px solid transparent",
      }}
    >
      <span style={{ textAlign: "right", paddingRight: 24, color: day.muted, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
      <span style={{ fontWeight: i === 0 ? 650 : 500, color: day.ink }}>{r.name}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ width: 300, height: 12, background: day.track, borderRadius: 8, overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${bar * 100}%`, background: i === 0 ? day.accent : day.trackFill, borderRadius: 8 }} />
        </span>
        <b style={{ fontWeight: 620, fontVariantNumeric: "tabular-nums", color: day.ink }}>{(bar * MAX).toFixed(2).replace(".", ",")}</b>
      </span>
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{(r.exp * 100 * Math.min(1, bar / (r.score / MAX))).toFixed(1).replace(".", ",")}%</span>
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.flow ? (r.flow > 0 ? day.pos : day.neg) : day.muted }}>
        {r.flow ? `${r.flow > 0 ? "▲" : "▼"} ${Math.abs(r.flow)} tx` : "—"}
      </span>
      <span style={{ paddingLeft: 30 }}>
        {r.trig ? (
          <span style={{ display: "inline-block", transform: `scale(${pill})` }}>
            <Chip tone={r.trig[1]}>{r.trig[0]}</Chip>
          </span>
        ) : (
          <span style={{ color: day.muted }}>—</span>
        )}
      </span>
    </div>
  );
}

export function Board(_: SceneProps) {
  const frame = useCurrentFrame();
  const tilt = interpolate(frame, [0, 60], [14, 0], { ...clamp, easing: easeOut });
  const drift = interpolate(frame, [0, 216], [1, 1.035], clamp);
  const clock = useSpring(12, { damping: 10, stiffness: 180 });
  const mins = Math.round(interpolate(frame, [12, 40], [0, 42], { ...clamp, easing: easeOut }));
  return (
    <Scene>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1800, marginTop: -60 }}>
        <div style={{ transform: `rotateX(${tilt}deg) scale(${drift})`, transformOrigin: "50% 30%" }}>
          <Enter delay={0} y={80} scale={0.94}>
            <Glass style={{ width: 1640, padding: "38px 44px 30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Enter delay={8} y={16}>
                    <Eyebrow>Skor perhatian · Senin, 28 Sep</Eyebrow>
                  </Enter>
                  <Enter delay={16} y={24}>
                    <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-0.035em", color: day.ink, marginTop: 12 }}>
                      Konsumen Primer <span style={{ color: day.muted, fontWeight: 500 }}>paling layak dicek</span>
                    </div>
                  </Enter>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ transform: `scale(${clock})`, display: "inline-block" }}>
                    <Chip tone="info">
                      <span style={{ width: 10, height: 10, borderRadius: 9, background: day.ok, boxShadow: `0 0 ${6 + 4 * Math.sin(frame / 4)}px ${day.ok}` }} />
                      Snapshot 05:{String(mins).padStart(2, "0")} WIB
                    </Chip>
                  </span>
                  <Enter delay={22} y={0} x={20}>
                    <Chip tone="plain">Data ilustrasi</Chip>
                  </Enter>
                </div>
              </div>

              <Enter delay={26} y={10}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLS,
                    padding: "26px 20px 10px",
                    fontSize: 18,
                    fontWeight: 650,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: day.label,
                  }}
                >
                  <span style={{ textAlign: "right", paddingRight: 24 }}>#</span>
                  <span>Sektor</span>
                  <span>Perhatian · 0–4,5</span>
                  <span style={{ textAlign: "right" }}>Eksposur</span>
                  <span style={{ textAlign: "right" }}>Flow</span>
                  <span style={{ paddingLeft: 30 }}>Pemicu</span>
                </div>
              </Enter>
              {ROWS.map((_, i) => (
                <Row key={i} i={i} />
              ))}
            </Glass>
          </Enter>
        </div>
      </AbsoluteFill>
      <Sfx name="whoosh" at={0} volume={0.45} />
      <Sfx name="pop" at={12} volume={0.4} />
      {ROWS.map((_, i) => (
        <Sfx key={i} name="tick" at={ROW_AT(i)} volume={0.25} />
      ))}
      <Sfx name="ding" at={HILITE} volume={0.45} />
    </Scene>
  );
}
