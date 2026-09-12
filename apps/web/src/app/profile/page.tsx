"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import CopyField from "@/components/CopyField";
import Nav from "@/components/Nav";
import WalletButton from "@/components/WalletButton";
import { fetchLicenses, type Prompt } from "@/lib/api";
import { useAgent } from "@/lib/useAgent";
import { useBalances } from "@/lib/useBalances";

const HASHSCAN = "https://hashscan.io/testnet/account";

/**
 * Everything the signed-in user owns, in one place: the wallet Privy created
 * for them, the Hedera account it maps to, what is in it, and what it holds a
 * licence for.
 *
 * Balances come from the Hedera mirror node through our own server, so they
 * are the chain's answer rather than our bookkeeping.
 */
export default function ProfilePage() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { state: agent } = useAgent();
  const linked = agent.phase === "linked";
  const balances = useBalances(linked);
  const [licences, setLicences] = useState<Prompt[] | null>(null);

  const account = linked ? agent.agent.account : undefined;
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    fetchLicenses(account)
      .then((prompts) => {
        if (!cancelled) setLicences(prompts);
      })
      .catch(() => {
        if (!cancelled) setLicences([]);
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <header className="py-8">
          <h1 className="mb-3 text-3xl font-normal tracking-tight sm:text-4xl">Profile</h1>
          {ready && authenticated && user?.email?.address && (
            <p className="text-base text-gray-600">{user.email.address}</p>
          )}
        </header>

        {ready && !authenticated && (
          <div className="space-y-4 rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-600">Sign in to see your wallet.</p>
            <div className="flex justify-center">
              <WalletButton />
            </div>
          </div>
        )}

        {ready && authenticated && (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Your wallet</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <CopyField
                  label="Wallet address"
                  value={wallet?.address}
                  hint="Created for you by Privy. No seed phrase to keep."
                />
                <CopyField
                  label="Hedera account"
                  value={account}
                  hint="Where payments come from, derived from the wallet above."
                />
              </div>
              {account && (
                <a
                  href={`${HASHSCAN}/${account}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs text-gray-500 underline hover:text-black"
                >
                  View this account on HashScan
                </a>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Balance</h2>
              {!linked && (
                <p className="rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">
                  <Link href="/connect" className="underline hover:text-black">
                    Set up payments
                  </Link>{" "}
                  to create your Hedera account.
                </p>
              )}
              {linked && balances.phase === "loading" && (
                <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-gray-100" />
              )}
              {linked && balances.phase === "unavailable" && (
                <p className="rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">
                  Couldn&apos;t read your balance from the Hedera mirror node right now.
                </p>
              )}
              {linked && balances.phase === "ready" && (
                <dl className="grid gap-4 rounded-2xl border border-gray-200 p-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-gray-500">USDC</dt>
                    <dd className="text-lg font-semibold text-black">
                      ${balances.balances.usdc ?? "0.00"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">HBAR</dt>
                    <dd className="text-lg font-semibold text-black">
                      {balances.balances.hbar ?? "0"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Cap per payment</dt>
                    <dd className="text-lg font-semibold text-black">${balances.balances.cap}</dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Licences</h2>
              {licences === null ? (
                <div aria-hidden className="h-16 animate-pulse rounded-2xl bg-gray-100" />
              ) : licences.length === 0 ? (
                <p className="rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">
                  No prompts owned yet.{" "}
                  <Link href="/prompts" className="underline hover:text-black">
                    Browse the gallery
                  </Link>
                  .
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200">
                  {licences.map((prompt) => (
                    <li key={prompt.id} className="flex items-center justify-between gap-3 p-4">
                      <Link
                        href={`/prompts/${prompt.id}`}
                        className="text-sm font-medium text-black hover:underline"
                      >
                        {prompt.title}
                      </Link>
                      <span className="font-mono text-xs text-gray-500">{prompt.creator}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
