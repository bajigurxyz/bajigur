"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

const RESET_MS = 2500;

/**
 * Copy-to-clipboard with named states and an aria-live confirmation, so the
 * result is announced rather than implied by an icon swap. A refusal (denied
 * permission, insecure context) says so and stays retryable.
 */
export default function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  /** What is being copied, for the accessible name and the announcement. */
  label: string;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
    resetTimer.current = setTimeout(() => setState("idle"), RESET_MS);
  };

  const caption =
    state === "copied" ? "Copied!" : state === "error" ? "Copy failed, retry" : "Copy";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
        }
      >
        {state === "copied" ? (
          <Check aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <Copy aria-hidden className="h-3.5 w-3.5" />
        )}
        {caption}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? `${label} copied to clipboard` : ""}
        {state === "error" ? `Copying ${label} failed` : ""}
      </span>
    </>
  );
}
