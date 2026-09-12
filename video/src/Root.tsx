import { Composition } from "remotion";
import { FPS, Opener, TOTAL } from "./Opener";

export const RemotionRoot = () => (
  <Composition
    id="Opener"
    component={Opener}
    durationInFrames={TOTAL}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
