import type { ComponentType } from "react";
import GlassNavPreview from "./GlassNavPreview";
import HeroRevealPreview from "./HeroRevealPreview";
import MagneticPreview from "./MagneticPreview";
import MarqueePreview from "./MarqueePreview";
import MediaPreview from "./MediaPreview";

/**
 * Live previews, keyed by prompt id.
 *
 * Each one RUNS the effect its prompt describes rather than replaying a video
 * of it, so the preview cannot drift from the thing being sold and there is no
 * media pipeline to maintain. It also means the claim is always true: what you
 * see is the effect, not a recording of something else.
 *
 * The trade-off is that it does not generalise. These four prompts are small
 * CSS/JS effects the browser can just run; a prompt from an outside creator
 * will have no entry here and simply renders no preview. That is deliberate —
 * a missing preview is honest, an unrelated video is not.
 */
const PREVIEWS: Record<string, ComponentType> = {
  "hero-scroll-reveal": HeroRevealPreview,
  "magnetic-buttons": MagneticPreview,
  "glass-nav": GlassNavPreview,
  "marquee-logos": MarqueePreview,
};

export const hasPreview = (id: string, media?: string) => Boolean(media) || id in PREVIEWS;

/**
 * A creator's own recording wins over a simulation of the effect. The live
 * previews below exist because the first four prompts shipped without media;
 * where a recording exists it is the better evidence, since it is what the
 * prompt actually produced.
 */
export default function PromptPreview({
  id,
  media,
  title,
  className,
}: {
  id: string;
  media?: string;
  title?: string;
  className?: string;
}) {
  const Preview = PREVIEWS[id];
  if (!media && !Preview) return null;

  return (
    <div
      // Decorative: the preview restates the prompt, it does not add meaning a
      // screen-reader user would miss, and the text is right below it.
      aria-hidden
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 ${className ?? ""}`}
    >
      {media ? <MediaPreview src={media} title={title ?? id} /> : Preview ? <Preview /> : null}
    </div>
  );
}
