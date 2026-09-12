"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type State = "idle" | "fetching" | "copied" | "error";

const RESET_MS = 2500;

/**
 * Copies a prompt this wallet already owns, without leaving the card.
 *
 * The text is not in the catalogue and never has been: `GET /prompts` returns
 * no body, and the only way to the text is `/api/unlock/[id]`, which answers
 * free for a licence holder and 402 for everyone else. So this fetches on
 * click rather than holding the body in the page, which also means nothing
 * sensitive sits in the markup of a page anyone can open.
 *
 * Named states, not a silent spinner: fetching is a real round trip through the
 * API and the chain, and a refusal says so rather than looking like a click
 * that missed.
 */
export default function CopyPromptButton({ id, title }: { id: string; title: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const settle = (next: State) => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), RESET_MS);
  };

  const copy = async () => {
    setState("fetching");
    try {
      const res = await fetch(`/api/unlock/${encodeURIComponent(id)}`, { method: "POST" });
      const data = (await res.json()) as { body?: string };
      if (!res.ok || !data.body) {
        settle("error");
        return;
      }
      await navigator.clipboard.writeText(data.body);
      settle("copied");
    } catch {
      settle("error");
    }
  };

  const caption =
    state === "fetching"
      ? "Copying…"
      : state === "copied"
        ? "Copied!"
        : state === "error"
          ? "Copy failed, retry"
          : "Copy prompt";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={state === "fetching"}
        aria-label={`Copy the ${title} prompt`}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-black transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {state === "fetching" ? (
          <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
        ) : state === "copied" ? (
          <Check aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <Copy aria-hidden className="h-3.5 w-3.5" />
        )}
        {caption}
      </button>
      {/* Announced to assistive tech; the button's own label already changed. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" && `${title} copied to clipboard`}
        {state === "error" && `Copying ${title} failed`}
      </span>
    </>
  );
}
