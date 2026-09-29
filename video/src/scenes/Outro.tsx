import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Enter, Sfx, clamp, easeOut } from "../anim";
import { Mark, Wordmark } from "../Logo";
import type { SceneProps } from "../Teaser";
import { day } from "../theme";
import { Chip } from "../ui";

export function Outro({ lines }: SceneProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const tag = lines[0].from + 34;
  const fade = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], clamp);
  const inP = interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: easeOut });
  const underline = interpolate(frame, [tag + 10, tag + 34], [0, 1], { ...clamp, easing: easeOut });
  return (
    <AbsoluteFill style={{ opacity: fade * inP, alignItems: "center", justifyContent: "center", marginTop: -50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <Mark size={130} delay={4} />
        <Wordmark delay={8} size={140} />
      </div>
      <Enter delay={tag} y={30}>
        <div style={{ fontSize: 54, fontWeight: 600, color: day.ink, marginTop: 44, letterSpacing: "-0.03em", textAlign: "center" }}>
          Tahu sektor mana yang layak dicek —{" "}
          <span style={{ position: "relative", color: day.accent }}>
            sebelum pasar buka.
            <span style={{ position: "absolute", left: 0, bottom: -10, height: 5, width: `${underline * 100}%`, background: day.accent, borderRadius: 4 }} />
          </span>
        </div>
      </Enter>
      <div style={{ display: "flex", gap: 14, marginTop: 56 }}>
        <Enter delay={tag + 24} y={20}>
          <Chip tone="info" style={{ fontSize: 24, padding: "10px 22px" }}>
            Sectors Hackathon 2026 · Track 3 · Market Intelligence
          </Chip>
        </Enter>
        <Enter delay={tag + 32} y={20}>
          <Chip tone="plain" style={{ fontSize: 24, padding: "10px 22px" }}>
            Bukan nasihat investasi
          </Chip>
        </Enter>
      </div>
      <Sfx name="whoosh" at={2} volume={0.45} />
      <Sfx name="chime" at={10} volume={0.45} />
      <Sfx name="swish" at={tag} volume={0.35} />
      <Sfx name="pop" at={tag + 24} volume={0.35} />
      <Sfx name="pop" at={tag + 32} volume={0.35} />
    </AbsoluteFill>
  );
}
