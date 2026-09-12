"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Buyers from "@/components/Buyers";
import Nav from "@/components/Nav";
import PromptCard from "@/components/PromptCard";
import PublishPrompt from "@/components/PublishPrompt";
import Skeleton, { SkeletonRegion } from "@/components/Skeleton";
import { fetchLicenses, fetchPrompts, type Prompt } from "@/lib/api";
import { useAgent } from "@/lib/useAgent";
import { useEmbeddedWallet } from "@/lib/useEmbeddedWallet";
import { useHederaAccount } from "@/lib/useHederaAccount";

type LoadState =
  | { phase: "idle" }
  | { phase: "pending" }
  | { phase: "error" }
  | { phase: "ready"; bought: Prompt[]; made: Prompt[] };

function Section({
  title,
  blurb,
  prompts,
  empty,
  action,
  footer,
}: {
  title: string;
  blurb: string;
  prompts: Prompt[];
  empty: React.ReactNode;
  action?: React.ReactNode;
  /** Rendered under each card. Published uses it for the buyer list. */
  footer?: (prompt: Prompt) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">
            {title}
            <span className="ml-2 text-sm font-normal text-gray-500">{prompts.length}</span>
          </h2>
          <p className="text-sm text-gray-600">{blurb}</p>
        </div>
        {action}
      </div>
      {prompts.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">{empty}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="space-y-3">
              <PromptCard prompt={prompt} />
              {footer?.(prompt)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Everything tied to this wallet, split by how it got there.
 *
 * Bought comes from the chain: the API reports which prompts the wallet holds
 * an ERC-1155 licence for, so a purchase made from Claude Desktop or the CLI
 * shows up here too.
 *
 * Made is derived rather than stored. A prompt pays its creator directly, so
 * the one whose payout account is this wallet is the one this wallet wrote.
 */
export default function MyPromptsPage() {
  const { state: agent } = useAgent();
  const wallet = useEmbeddedWallet();
  const chain = useHederaAccount(wallet.address);
  const onChain = chain.phase === "ready" && chain.account.exists ? chain.account : undefined;
  const account = (agent.phase === "linked" ? agent.agent.account : undefined) ?? onChain?.account;

  const [load, setLoad] = useState<LoadState>({ phase: "idle" });
  // Bumped after publishing, so the new prompt appears without a reload.
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const [loadedFor, setLoadedFor] = useState(account);
  if (loadedFor !== account) {
    setLoadedFor(account);
    setLoad(account ? { phase: "pending" } : { phase: "idle" });
  }

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    Promise.all([fetchLicenses(account), fetchPrompts()])
      .then(([bought, all]) => {
        if (cancelled) return;
        const made = all.filter((prompt) => prompt.payTo === account);
        setLoad({ phase: "ready", bought, made });
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [account, attempt]);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <header className="py-8">
          <h1 className="mb-3 text-3xl font-normal tracking-tight sm:text-4xl">My prompts</h1>
          <p className="max-w-2xl text-base text-gray-600">
            The prompts you have bought and the ones you have published.
          </p>
          {account && <p className="mt-2 font-mono text-xs text-gray-500">{account}</p>}
        </header>

        {!account && (
          <p className="rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            <Link href="/profile" className="underline hover:text-black">
              Activate your wallet
            </Link>{" "}
            to see what it holds.
          </p>
        )}

        {load.phase === "pending" && (
          <SkeletonRegion
            label="Loading your prompts…"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {["a", "b", "c"].map((key) => (
              <Skeleton key={key} className="h-48 rounded-2xl" />
            ))}
          </SkeletonRegion>
        )}

        {load.phase === "error" && (
          <p
            role="alert"
            className="rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600"
          >
            Couldn&apos;t read your prompts right now. Try again in a moment.
          </p>
        )}

        {load.phase === "ready" && (
          <div className="space-y-10">
            <Section
              title="Bought"
              blurb="Paid for once. The licence is onchain, so these open free from any client, forever."
              prompts={load.bought}
              empty={
                <>
                  Nothing bought yet.{" "}
                  <Link href="/prompts" className="underline hover:text-black">
                    Browse the marketplace
                  </Link>
                  .
                </>
              }
            />
            <Section
              title="Published"
              blurb="Prompts you sell. Every purchase pays this wallet directly, with nothing held in between."
              prompts={load.made}
              empty="You haven't published a prompt yet."
              action={account ? <PublishPrompt onPublished={reload} /> : undefined}
              footer={(prompt) => <Buyers promptId={prompt.id} />}
            />
          </div>
        )}
      </main>
    </div>
  );
}
