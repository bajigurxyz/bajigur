"use client";

import { useState } from "react";

const WORDS = ["Pinned", "hero,", "revealed", "word", "by", "word"];
const STAGGER_MS = 40;

/**
 * `hero-scroll-reveal`: the headline splits into words that rise and fade in
 * on a 40ms stagger.
 *
 * The prompt's parallax half needs a pinned full-viewport section, which a
 * card cannot honestly show — so the preview commits to the part it can run
 * truthfully. Hovering replays it by remounting the words.
 */
export default function HeroRevealPreview() {
  const [run, setRun] = useState(0);

  return (
    <div
      onPointerEnter={() => setRun((n) => n + 1)}
      className="flex h-full items-center justify-center px-4"
    >
      <p key={run} className="flex flex-wrap justify-center gap-x-1.5 text-sm text-gray-800">
        {WORDS.map((word, i) => (
          <span
            key={`${run}-${word}-${i}`}
            className="preview-word"
            style={{ animationDelay: `${i * STAGGER_MS}ms` }}
          >
            {word}
          </span>
        ))}
      </p>
    </div>
  );
}
