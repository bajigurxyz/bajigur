"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * The creator's own recording of what a prompt produces, straight from the
 * catalogue's `previewMedia`.
 *
 * Everything here comes from the API. An earlier version simulated four of the
 * effects in React, keyed by prompt id, which only ever worked for ids someone
 * had hand written and could drift from the prompt it claimed to show. A
 * prompt with no recording shows no preview, which is the honest gap.
 *
 * `unoptimized` on purpose: these are animated WebP, and the image optimizer
 * would flatten them to a still frame, which is the part worth showing.
 */
export default function PromptPreview({
  src,
  title,
  className,
  /** Flush to the card's edges, with no frame of its own. */
  bleed = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: {
  src?: string;
  title: string;
  className?: string;
  bleed?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <div
      // Decorative: it restates the prompt beside it rather than adding meaning
      // a screen-reader user would otherwise miss.
      aria-hidden
      className={`relative overflow-hidden bg-gray-50 ${
        bleed ? "" : "rounded-xl border border-gray-200"
      } ${className ?? ""}`}
    >
      <Image
        src={src}
        alt={`Preview of ${title}`}
        fill
        unoptimized
        sizes={sizes}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
