"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import PromptCard from "@/components/PromptCard";
import Skeleton, { SkeletonRegion } from "@/components/Skeleton";
import TagFilter from "@/components/TagFilter";
import { fetchPrompts, type Prompt, tagsOf } from "@/lib/api";

type LoadState = { phase: "pending" } | { phase: "error" } | { phase: "ready"; prompts: Prompt[] };

export default function PromptsPage() {
  const [load, setLoad] = useState<LoadState>({ phase: "pending" });
  const [tag, setTag] = useState<string | null>(null);
  // Bumped by the retry control; the effect refetches on every bump.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPrompts()
      .then((prompts) => {
        if (!cancelled) setLoad({ phase: "ready", prompts });
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const prompts = load.phase === "ready" ? load.prompts : [];
  const shown = tag ? prompts.filter((p) => p.tags.includes(tag)) : prompts;

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <header className="py-8">
          <h1 className="mb-3 text-3xl font-normal tracking-tight sm:text-4xl">Marketplace</h1>
          <p className="max-w-2xl text-base text-gray-600">
            Every prompt here is priced by its creator and paid straight to them over x402 on
            Hedera. Buying one mints a licence to your wallet, so you only ever pay once.
          </p>
        </header>

        {load.phase === "ready" && prompts.length > 0 && (
          <div className="mb-8">
            <TagFilter tags={tagsOf(prompts)} selected={tag} onSelect={setTag} />
          </div>
        )}

        {load.phase === "pending" && (
          <SkeletonRegion
            label="Loading the catalogue…"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {["a", "b", "c", "d", "e", "f"].map((key) => (
              <Skeleton key={key} className="h-56 rounded-2xl" />
            ))}
          </SkeletonRegion>
        )}

        {load.phase === "error" && (
          <div role="alert" className="rounded-2xl border border-gray-200 p-8 text-center">
            <p className="mb-1 text-sm font-medium text-black">The catalogue didn&apos;t load</p>
            <p className="mb-5 text-sm text-gray-600">
              The Bajigur API isn&apos;t reachable right now. Nothing is lost, so try again.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoad({ phase: "pending" });
                setAttempt((n) => n + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-black transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        )}

        {load.phase === "ready" && shown.length === 0 && (
          <p className="rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            {prompts.length === 0 ? "The catalogue is empty." : `No prompt is tagged “${tag}” yet.`}
          </p>
        )}

        {shown.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
