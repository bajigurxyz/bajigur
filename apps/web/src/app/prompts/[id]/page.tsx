"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import UnlockButton from "@/components/UnlockButton";
import { ApiError, fetchPrompt, formatHbar, formatUsd, type Prompt } from "@/lib/api";
import { useAgent } from "@/lib/useAgent";

type LoadState =
  | { phase: "pending" }
  | { phase: "missing" }
  | { phase: "error" }
  | { phase: "ready"; prompt: Prompt };

export default function PromptDetailPage({ params }: PageProps<"/prompts/[id]">) {
  const { id } = use(params);
  const [load, setLoad] = useState<LoadState>({ phase: "pending" });
  const { state: agent } = useAgent();

  // Adjust state during render rather than in the effect: navigating between
  // prompts has to show the pending state again without a cascading render.
  const [loadedId, setLoadedId] = useState(id);
  if (loadedId !== id) {
    setLoadedId(id);
    setLoad({ phase: "pending" });
  }

  useEffect(() => {
    let cancelled = false;
    fetchPrompt(id)
      .then((prompt) => {
        if (!cancelled) setLoad({ phase: "ready", prompt });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoad({ phase: err instanceof ApiError && err.status === 404 ? "missing" : "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <Link
          href="/prompts"
          className="mt-6 inline-block text-sm text-gray-500 transition-colors hover:text-black"
        >
          ← Back to the gallery
        </Link>

        {load.phase === "pending" && (
          <div role="status" className="mt-8 space-y-4">
            <div aria-hidden className="h-8 w-2/3 animate-pulse rounded bg-gray-100" />
            <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            <span className="sr-only">Loading the prompt…</span>
          </div>
        )}

        {load.phase === "missing" && (
          <p
            role="alert"
            className="mt-8 rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600"
          >
            No prompt with the id <code className="font-mono">{id}</code> is in the catalogue.
          </p>
        )}

        {load.phase === "error" && (
          <p
            role="alert"
            className="mt-8 rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600"
          >
            The Bajigur API isn&apos;t reachable right now. Try again in a moment.
          </p>
        )}

        {load.phase === "ready" && (
          <article className="mt-8 space-y-6">
            <header className="space-y-3">
              <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">
                {load.prompt.title}
              </h1>
              <p className="text-base leading-relaxed text-gray-600">{load.prompt.preview}</p>
              <ul className="flex flex-wrap gap-1.5">
                {load.prompt.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </header>

            <dl className="grid gap-4 rounded-2xl border border-gray-200 p-5 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-gray-500">Price</dt>
                <dd className="font-semibold text-black">
                  {formatUsd(load.prompt.priceUsd)}{" "}
                  <span className="font-normal text-gray-500">
                    / {formatHbar(load.prompt.priceHbar)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Creator</dt>
                <dd className="font-mono text-xs text-black">{load.prompt.creator ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Paid to</dt>
                <dd className="font-mono text-xs text-black">{load.prompt.payTo ?? "—"}</dd>
              </div>
            </dl>

            <UnlockButton prompt={load.prompt} linked={agent.phase === "linked"} />
          </article>
        )}
      </main>
    </div>
  );
}
