import { Composition } from "remotion";
import { Teaser } from "./Teaser";
import timeline from "./timeline.json";

export function Root() {
  return (
    <Composition id="Teaser" component={Teaser} durationInFrames={timeline.total} fps={timeline.fps} width={1920} height={1080} />
  );
}
