"use client";

/**
 * `marquee-logos`: a seamless CSS strip that pauses on hover.
 *
 * The track is duplicated so translating it by -50% lands exactly where it
 * started — the same trick the prompt describes. Edges are masked so items
 * dissolve rather than clip.
 */
const SHAPES = ["rounded-full", "rounded-sm", "rounded-md rotate-45", "rounded-full", "rounded-sm"];

export default function MarqueePreview() {
  const track = [...SHAPES, ...SHAPES];
  return (
    <div className="preview-marquee-host flex h-full items-center overflow-hidden">
      <div
        className="preview-marquee flex w-max shrink-0 items-center gap-6"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        {/* Two copies of the same track; the duplicate is what makes the loop seamless. */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-6">
            {track.map((shape, i) => (
              <span
                key={`${copy}-${shape}-${i}`}
                className={`h-5 w-5 shrink-0 bg-gray-400/70 ${shape}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
