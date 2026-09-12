"use client";

import { useEffect, useState } from "react";
import { labelError } from "@/lib/ens";

export type Availability =
  | { phase: "idle" }
  | { phase: "invalid"; reason: string }
  | { phase: "checking" }
  | { phase: "free" }
  | { phase: "taken" }
  | { phase: "unsupported" };

const DEBOUNCE_MS = 350;

/**
 * Whether a label is still free under the parent name.
 *
 * Debounced, because asking on every keystroke makes typing "axel" four round
 * trips, three of them about a label the user has already moved past.
 *
 * The answer is stored with the label it answers, and only counts while the two
 * still match. That is what stops a slow reply about "ax" landing after a fast
 * reply about "axel" and relabelling it. Everything decidable without the
 * network is decided during render, so the effect only ever holds the request.
 */
export function useNameAvailability(label: string): Availability {
  const [answer, setAnswer] = useState<{
    label: string;
    phase: "free" | "taken" | "unsupported";
  }>();

  useEffect(() => {
    // A label the contract would reject never costs a request: `labelError`
    // mirrors `BajigurRegistrar.isValidLabel`.
    if (!label || labelError(label)) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/ens/available?label=${encodeURIComponent(label)}`, { cache: "no-store" })
        .then(async (res) => {
          if (cancelled) return;
          if (res.status === 501 || res.status === 503) {
            setAnswer({ label, phase: "unsupported" });
            return;
          }
          const data = (await res.json()) as { available?: boolean };
          setAnswer({ label, phase: data.available ? "free" : "taken" });
        })
        .catch(() => {});
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [label]);

  if (!label) return { phase: "idle" };
  const invalid = labelError(label);
  if (invalid) return { phase: "invalid", reason: invalid };
  return answer?.label === label ? { phase: answer.phase } : { phase: "checking" };
}
