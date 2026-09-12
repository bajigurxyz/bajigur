"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Whether the user asked for less motion.
 *
 * `useSyncExternalStore` rather than an effect: matchMedia is external state,
 * and reading it this way keeps `react-hooks/set-state-in-effect` satisfied.
 * The server snapshot is `false` so markup matches the common case and the
 * first client render corrects it.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
