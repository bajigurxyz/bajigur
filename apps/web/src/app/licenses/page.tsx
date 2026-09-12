"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import PromptCard from "@/components/PromptCard";
import { fetchLicenses, type Prompt } from "@/lib/api";
import { useAgent } from "@/lib/useAgent";

type LoadState =
  | { phase: "idle" }
  | { phase: "pending" }
  | { phase: "error" }
  | { phase: "ready"; prompts: Prompt[] };

/**
 * What this wallet owns, read from the chain rather than from a purchase log:
 * apps/api answers this by checking `balanceOf` on PromptRegistry, so a licence
 * minted from any client — the web app, Claude Desktop, the CLI — shows up here.
 */
export default function LicensesPage() {
  const { state: agent } = useAgent();
  const [load, setLoad] = useState<LoadState>({ phase: "idle" });
  const account = agent.phase === "linked" ? agent.agent.account : undefined;

  // Adjust state during render rather than in the effect: a different account
  // has to show the spinner again without cascading an extra render.
  const [loadedFor, setLoadedFor] = useState(account);
  if (loadedFor !== account) {
    setLoadedFor(account);
    setLoad(account ? { phase: "pending" } : { phase: "idle" });
  }

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    fetchLicenses(account)
      .then((prompts) => {
        if (!cancelled) setLoad({ phase: "ready", prompts });
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <header className="py-8">
          <h1 className="mb-3 text-3xl font-normal tracking-tight sm:text-4xl">My licences</h1>
          <p className="max-w-2xl text-base text-gray-600">
            Every prompt your wallet holds an onchain licence for. These open for free from any
            client, forever.
          </p>
          {account && <p className="mt-2 font-mono text-xs text-gray-500">{account}</p>}
        </header>

        {agent.phase === "unlinked" && (
          <p className="rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            <Link href="/connect" className="underline hover:text-black">
              Connect a wallet
            </Link>{" "}
            to see what it owns.
          </p>
        )}

        {(agent.phase === "loading" || load.phase === "pending") && (
          <div role="status" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {["a", "b", "c"].map((key) => (
              <div key={key} aria-hidden className="h-48 animate-pulse rounded-2xl bg-gray-100" />
            ))}
            <span className="sr-only">Loading your licences…</span>
          </div>
        )}

        {load.phase === "error" && (
          <p
            role="alert"
            className="rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600"
          >
            Couldn&apos;t read your licences from the chain. Try again in a moment.
          </p>
        )}

        {load.phase === "ready" && load.prompts.length === 0 && (
          <p className="rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            No licences yet.{" "}
            <Link href="/prompts" className="underline hover:text-black">
              Browse the gallery
            </Link>
            .
          </p>
        )}

        {load.phase === "ready" && load.prompts.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {load.prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
