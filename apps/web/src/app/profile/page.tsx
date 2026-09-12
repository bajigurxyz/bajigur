"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import CopyField from "@/components/CopyField";
import Nav from "@/components/Nav";
import { HbarMark, UsdcMark } from "@/components/TokenMark";
import WalletButton from "@/components/WalletButton";
import { fetchLicenses, type Prompt } from "@/lib/api";
import { useAgent } from "@/lib/useAgent";
import { useBalances } from "@/lib/useBalances";
import { useEmbeddedWallet } from "@/lib/useEmbeddedWallet";
import { useHederaAccount } from "@/lib/useHederaAccount";

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
  const wallet = useEmbeddedWallet();
  const { state: agent } = useAgent();
  const linked = agent.phase === "linked";
  const balances = useBalances(linked);
  const [licences, setLicences] = useState<Prompt[] | null>(null);

  // Two sources, because they become available at different times: the agent
  // token knows the account once payments are set up, and the mirror node knows
  // it as soon as the chain does.
  const chain = useHederaAccount(wallet.address);
  const onChain = chain.phase === "ready" && chain.account.exists ? chain.account : undefined;
  const account = (linked ? agent.agent.account : undefined) ?? onChain?.account;

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
                  value={wallet.address}
                  hint="Created for you by Privy. No seed phrase to keep."
                />
                <CopyField
                  label="Hedera account"
                  value={account}
                  hint={
                    account
                      ? "Where payments come from. The same wallet, under its Hedera name."
                      : "The same wallet under its Hedera name. It is created the first time something is sent to the address, which is what setting up payments does."
                  }
                />
              </div>
              {!wallet.address && (
                <div className="space-y-2 rounded-2xl border border-gray-200 p-5">
                  <p className="text-sm text-gray-600">
                    You don&apos;t have a wallet yet. Creating one takes a second and costs nothing.
                  </p>
                  <button
                    type="button"
                    onClick={wallet.create}
                    disabled={wallet.creating}
                    className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
                  >
                    {wallet.creating ? "Creating…" : "Create my wallet"}
                  </button>
                  {wallet.error && (
                    <p role="alert" className="text-xs text-red-700">
                      {wallet.error}
                    </p>
                  )}
                </div>
              )}

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
              {!linked && !onChain && (
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
              {!linked && onChain && (
                <dl className="grid gap-4 rounded-2xl border border-gray-200 p-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                      <UsdcMark className="h-4 w-4" />
                      USDC
                    </dt>
                    <dd className="text-lg font-semibold text-black">${onChain.usdc}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                      <HbarMark className="h-4 w-4" />
                      HBAR
                    </dt>
                    <dd className="text-lg font-semibold text-black">{onChain.hbar}</dd>
                  </div>
                </dl>
              )}
              {linked && balances.phase === "ready" && (
                <dl className="grid gap-4 rounded-2xl border border-gray-200 p-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                      <UsdcMark className="h-4 w-4" />
                      USDC
                    </dt>
                    <dd className="text-lg font-semibold text-black">
                      ${balances.balances.usdc ?? "0.00"}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                      <HbarMark className="h-4 w-4" />
                      HBAR
                    </dt>
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
              {linked && balances.phase === "ready" && (
                <p className="text-xs text-gray-500">
                  Running low? Circle&apos;s faucet gives 20 testnet USDC every two hours at{" "}
                  <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-black"
                  >
                    faucet.circle.com
                  </a>
                  . Paste the Hedera account above, not the wallet address.
                </p>
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
