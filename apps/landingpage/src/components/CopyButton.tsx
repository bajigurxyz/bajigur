"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

const RESET_MS = 2500;

/**
 * Copy to clipboard with named states and an aria-live confirmation, so the
 * result is announced rather than implied by an icon swap. A refusal (denied
 * permission, insecure context) says so and stays retryable.
 */
export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const settle = (next: CopyState) => {
    setState(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), RESET_MS);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      settle("copied");
    } catch {
      settle("error");
    }
  };

  const caption =
    state === "copied" ? "Copied!" : state === "error" ? "Copy failed, retry" : "Copy";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy the ${label} setup block`}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 focus-visible:outline-none"
      >
        {state === "copied" ? (
          <Check aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <Copy aria-hidden className="h-3.5 w-3.5" />
        )}
        {caption}
      </button>
      {/* Announced to assistive tech; visually the button text already changed. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" && `${label} setup block copied to clipboard`}
        {state === "error" && `Copying the ${label} setup block failed`}
      </span>
    </>
  );
}
