"use client";

import { useState } from "react";

/**
 * `glass-nav`: a sticky bar that is transparent at the top of the page and,
 * past 24px of scroll, transitions over 300ms to a blurred translucent surface
 * with a hairline bottom border.
 *
 * The preview owns its own scroll container, so the state change is real —
 * scroll inside the box and the bar reacts, using the prompt's own threshold.
 */
export default function GlassNavPreview() {
  const [scrolled, setScrolled] = useState(false);

  return (
    <div
      onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 24)}
      className="h-full overflow-y-auto bg-gradient-to-br from-gray-700 to-gray-900"
    >
      <div
        className={`sticky top-0 z-10 flex items-center justify-between px-3 py-2 transition-all duration-300 ease-out ${
          scrolled
            ? "border-b border-black/10 bg-white/70 text-gray-900 backdrop-blur-md backdrop-saturate-150"
            : "border-b border-transparent bg-transparent text-white"
        }`}
      >
        <span className="text-[10px] font-semibold">Logo</span>
        <span className="text-[10px] opacity-80">Work · About</span>
      </div>
      {/* Something to scroll past, so the threshold can actually be crossed. */}
      <div className="h-32 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.06)_0_8px,transparent_8px_16px)]" />
      <p className="px-3 pb-2 text-center text-[9px] text-white/50">scroll inside me</p>
    </div>
  );
}
