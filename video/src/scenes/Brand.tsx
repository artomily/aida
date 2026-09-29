import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Enter, Scene, Sfx, clamp } from "../anim";
import { Mark, Wordmark } from "../Logo";
import type { SceneProps } from "../Teaser";
import { day } from "../theme";
import { Eyebrow } from "../ui";

export function Brand(_: SceneProps) {
  const frame = useCurrentFrame();
  // Slow push-in so the lockup never sits still.
  const push = interpolate(frame, [0, 105], [1.04, 1], clamp);
  return (
    <Scene enter={2}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${push})`, marginTop: -40 }}>
        <Enter delay={2} y={0} scale={0.6} blur={0}>
          <Eyebrow style={{ textAlign: "center", marginBottom: 34 }}>Kenalkan</Eyebrow>
        </Enter>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Mark size={170} delay={4} />
          <Wordmark delay={12} size={180} />
        </div>
        <Enter delay={46} y={24}>
          <div style={{ fontSize: 40, color: day.muted, marginTop: 36, fontWeight: 420, letterSpacing: "-0.01em" }}>
            Skor perhatian sektor IDX, dari keterkaitan dengan SGX
          </div>
        </Enter>
      </AbsoluteFill>
      <Sfx name="impact" at={0} volume={0.8} />
      <Sfx name="whoosh" at={10} volume={0.45} />
      <Sfx name="chime" at={28} volume={0.45} />
      <Sfx name="swish" at={46} volume={0.3} />
    </Scene>
  );
}
