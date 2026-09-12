"use client";

import { usePrivy } from "@privy-io/react-auth";
import ActivateAccount from "@/components/ActivateAccount";
import AssociateUsdc from "@/components/AssociateUsdc";
import ClaimEnsName from "@/components/ClaimEnsName";
import CopyField from "@/components/CopyField";
import Faucets from "@/components/Faucets";
import Nav from "@/components/Nav";
import { HbarMark, UsdcMark } from "@/components/TokenMark";
import WalletButton from "@/components/WalletButton";
import { useAgent } from "@/lib/useAgent";
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
  const { state: agent, refresh: refreshAgent } = useAgent();
  const linked = agent.phase === "linked";

  // Two sources, because they become available at different times: the agent
  // token knows the account once payments are set up, and the mirror node knows
  // it as soon as the chain does.
  const chain = useHederaAccount(wallet.address);
  const onChain = chain.phase === "ready" && chain.account.exists ? chain.account : undefined;
  const me = linked ? agent.agent : undefined;
  const account = (me?.exists === false ? undefined : me?.account) ?? onChain?.account;
  // The API reports balances alongside identity; the mirror lookup covers a
  // wallet that has an account but has not set up payments.
  const hbar = me?.hbar ?? onChain?.hbar;
  const usdc = me?.usdc ?? onChain?.usdc;
  const needsUsdc = me?.exists === true && me.associated === false;

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
                  hint={
                    account
                      ? "Created for you by Privy. No seed phrase to keep."
                      : "Created for you by Privy. Send anything here and Hedera creates the account below on arrival."
                  }
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
              {!account && <ActivateAccount />}

              {account && needsUsdc && <AssociateUsdc onDone={refreshAgent} />}

              {account && (
                <dl className="grid gap-4 rounded-2xl border border-gray-200 p-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                      <UsdcMark className="h-4 w-4" />
                      USDC
                    </dt>
                    <dd className="text-lg font-semibold text-black">${usdc ?? "0.00"}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                      <HbarMark className="h-4 w-4" />
                      HBAR
                    </dt>
                    <dd className="text-lg font-semibold text-black">{hbar ?? "0"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Cap per payment</dt>
                    <dd className="text-lg font-semibold text-black">
                      {me ? `$${me.cap}` : "Not set up"}
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Your name</h2>
              <ClaimEnsName current={me?.ensName} account={account} onClaimed={refreshAgent} />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Faucets</h2>
              <Faucets />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
