"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A recording of what the prompt produces, supplied by its creator.
 *
 * `unoptimized` on purpose: these are animated WebP, and running them through
 * the image optimizer would flatten them to a still frame, which is precisely
 * the thing worth showing.
 *
 * A preview that fails to load degrades to nothing rather than a broken image
 * box. The card still has its title, preview line and price.
 */
export default function MediaPreview({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={src}
      alt={`Preview of ${title}`}
      fill
      unoptimized
      sizes="(max-width: 640px) 100vw, 33vw"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}
