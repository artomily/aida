import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Enter, Scene, Sfx, clamp, easeOut, useSpring } from "../anim";
import type { SceneProps } from "../Teaser";
import { day } from "../theme";
import { Chip, Glass } from "../ui";

// Illustrative outcome of the per-sector lead-lag test.
const SECTORS: [string, boolean, string][] = [
  ["Konsumen Primer", true, "0,21"],
  ["Perindustrian", true, "0,18"],
  ["Keuangan", true, "0,12"],
  ["Properti", true, "0,09"],
  ["Infrastruktur", false, "0,04"],
  ["Kesehatan", false, "0,03"],
  ["Energi", false, "0,02"],
  ["Barang Baku", false, "−0,01"],
  ["Transportasi", false, "0,01"],
  ["Non-Primer", false, "0,00"],
  ["Teknologi", false, "—"],
];
const TEST_AT = (i: number) => 58 + i * 7;
const METER_AT = TEST_AT(SECTORS.length - 1) + 14;

function Tile({ i }: { i: number }) {
  const frame = useCurrentFrame();
  const [name, sig, beta] = SECTORS[i];
  const at = TEST_AT(i);
  const enter = useSpring(30 + i * 2, { damping: 14, stiffness: 160 });
  const done = frame >= at;
  const stamp = useSpring(at, { damping: 13, stiffness: 220 });
  const scan = ((frame - 30 - i * 3) % 24) / 24;
  return (
    <Glass
      style={{
        width: 250,
        height: 150,
        padding: "20px 22px",
        borderRadius: 22,
        position: "relative",
        overflow: "hidden",
        opacity: Math.min(1, enter * 1.4),
        transform: `translateY(${(1 - enter) * 50}px) scale(${done ? 1 + 0.05 * Math.sin(Math.min(1, stamp) * Math.PI) : 1})`,
        borderColor: done && sig ? "rgba(31,107,67,0.5)" : day.glassLine,
        background: done && sig ? "rgba(230,244,236,0.85)" : day.glass,
      }}
    >
      {!done && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${scan * 140 - 40}%`,
            width: "40%",
            background: "linear-gradient(90deg, transparent, rgba(74,120,176,0.2), transparent)",
          }}
        />
      )}
      <div style={{ fontSize: 25, fontWeight: 620, color: day.ink, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "absolute", left: 22, bottom: 18, right: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {done ? (
          <span style={{ transform: `scale(${stamp})`, transformOrigin: "left center", display: "inline-block" }}>
            <span style={{ fontSize: 22, fontWeight: 650, color: sig ? day.ok : day.muted }}>{sig ? "✓ signifikan" : "– tidak"}</span>
          </span>
        ) : (
          <span style={{ fontSize: 22, color: day.muted }}>menguji{".".repeat(1 + (Math.floor(frame / 6) % 3))}</span>
        )}
        <span style={{ fontSize: 20, color: day.muted, fontVariantNumeric: "tabular-nums", opacity: done ? 1 : 0.3 }}>β {beta}</span>
      </div>
    </Glass>
  );
}

export function Honest(_: SceneProps) {
  const frame = useCurrentFrame();
  const sig = SECTORS.filter((s, i) => s[1] && frame >= TEST_AT(i)).length;
  const fill = interpolate(frame, [METER_AT, METER_AT + 24], [0, 4 / 11], { ...clamp, easing: easeOut });
  return (
    <Scene>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 100 }}>
        <Enter delay={10} y={40} scale={0.9}>
          <div style={{ fontSize: 96, fontWeight: 750, letterSpacing: "-0.045em", color: day.ink }}>Tanpa asumsi.</div>
        </Enter>
        <Enter delay={30} y={20}>
          <div style={{ fontSize: 36, color: day.muted, marginTop: 6 }}>Uji lead-lag SGX → IDX, satu per satu sektor</div>
        </Enter>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: 90 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, width: 1600 }}>
          {SECTORS.map((_, i) => (
            <Tile key={i} i={i} />
          ))}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 150 }}>
        <Enter delay={METER_AT} y={30}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ fontSize: 58, fontWeight: 720, color: day.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
              {sig} / 11
            </div>
            <div style={{ width: 420, height: 14, background: day.track, borderRadius: 9 }}>
              <div style={{ width: `${fill * 100}%`, height: "100%", background: day.ok, borderRadius: 9 }} />
            </div>
            <div style={{ fontSize: 24, color: day.muted, lineHeight: 1.3 }}>
              signifikan setelah koreksi
              <br />
              Benjamini–Hochberg
            </div>
            <Chip tone="plain">Data ilustrasi</Chip>
          </div>
        </Enter>
      </AbsoluteFill>

      <Sfx name="impact" at={10} volume={0.35} />
      <Sfx name="swish" at={30} volume={0.35} />
      {SECTORS.map(([, s], i) => (
        <Sfx key={i} name={s ? "check" : "tick"} at={TEST_AT(i)} volume={s ? 0.45 : 0.3} />
      ))}
      <Sfx name="whoosh" at={METER_AT - 2} volume={0.35} />
    </Scene>
  );
}
