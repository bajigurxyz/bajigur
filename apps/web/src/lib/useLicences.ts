"use client";

import { useEffect, useState } from "react";
import { fetchLicenses } from "@/lib/api";

/**
 * The prompt ids this wallet already holds a licence for.
 *
 * One request for the whole page rather than one per card: the answer is the
 * same for every card on screen, and a card cannot ask for itself without
 * turning a catalogue of twenty into twenty round trips.
 *
 * Read from the chain through the API, so a purchase made from Claude or the
 * CLI counts here too. An empty set while it loads is the honest default: a
 * card that briefly offers to sell something you own is a smaller wrong than a
 * card that hides the way to buy.
 */
export function useLicences(account?: string): Set<string> {
  const [owned, setOwned] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    fetchLicenses(account)
      .then((prompts) => {
        if (!cancelled) setOwned(new Set(prompts.map((prompt) => prompt.id)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [account]);

  return owned;
}
