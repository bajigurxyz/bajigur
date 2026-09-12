"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import CopyButton from "@/components/CopyButton";
import Skeleton, { SkeletonRegion } from "@/components/Skeleton";
import WalletButton from "@/components/WalletButton";
import { useAgent } from "@/lib/useAgent";
import { useLinkAgent } from "@/lib/useLinkAgent";

const MCP_URL = `${(process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3004").replace(/\/+$/, "")}/mcp`;

/**
 * One line, because that is the whole setup. The server is hosted, so there is
 * nothing to clone, no runtime to install, and no absolute path to correct:
 * the URL is the server and the token is the wallet.
 */
const addCommand = (token: string) =>
  `claude mcp add --transport http bajigur ${MCP_URL} --header "Authorization: Bearer ${token}"`;

/**
 * The three states between signing in and an agent that can spend: signed out,
 * signed in without access granted, and linked.
 *
 * Granting access is the part that deserves explaining, since the user is
 * letting a service move their money, so the caps and the revocation path are
 * stated on the control itself, before they agree.
 */
export default function ConnectPanel() {
  const { ready, authenticated } = usePrivy();
  const { state, refresh } = useAgent();
  const { access, step, message, link: connect, busy } = useLinkAgent(refresh);
  const [token, setToken] = useState<string | null>(null);

  // Fetched as soon as the wallet is linked. The command is useless without it,
  // so a reveal step would only put a click between the user and their copy.
  useEffect(() => {
    if (state.phase !== "linked") return;
    let cancelled = false;
    fetch("/api/agent/token")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { token: string } | null) => {
        if (!cancelled && data) setToken(data.token);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  if (!ready) {
    return (
      <SkeletonRegion label="Loading your wallet…" className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </SkeletonRegion>
    );
  }

  if (!authenticated) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Sign in with an email or a social account. Privy creates a wallet for you, with no seed
          phrase to keep and no gas to buy.
        </p>
        <WalletButton />
      </div>
    );
  }

  if (state.phase === "linked") {
    return (
      <div className="space-y-6">
        <dl className="grid gap-4 rounded-2xl border border-gray-200 p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Hedera account</dt>
            <dd className="font-mono text-xs text-black">{state.agent.account}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Wallet</dt>
            <dd className="font-mono text-xs break-all text-black">
              {access.address ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Cap per payment</dt>
            <dd className="font-semibold text-black">${state.agent.cap}</dd>
          </div>
        </dl>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Use it from Claude</h2>
          <p className="text-sm text-gray-600">
            Run this once, then ask Claude to find and buy a prompt. Your agent pays from this
            wallet, never above the cap, and you hold no key.
          </p>
          {token ? (
            <div className="overflow-hidden rounded-2xl bg-gray-950">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
                <span className="text-xs text-gray-400">Terminal</span>
                <CopyButton
                  text={addCommand(token)}
                  label="the Claude setup command"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                />
              </div>
              <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed break-all whitespace-pre-wrap text-gray-100">
                <code>{addCommand(token)}</code>
              </pre>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading your setup command…</p>
          )}
          <p className="text-xs text-gray-500">
            The token lets an agent spend from your wallet up to ${state.agent.cap} per payment.
            Treat it like a card number, and revoke the delegation in Privy to kill it.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!access.configured && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          Payments are not configured on this deployment: NEXT_PUBLIC_PRIVY_SIGNER_ID is missing.
          Create a key quorum in the Privy dashboard under Authorization keys and set its id.
        </p>
      )}
      <ul className="space-y-1.5 text-sm text-gray-600">
        <li>Bajigur signs payments for you, so an agent can buy without asking every time.</li>
        <li>Only Bajigur creators can be paid, and never more than the cap per payment.</li>
        <li>Revoke it in Privy whenever you want.</li>
      </ul>
      <button
        type="button"
        onClick={connect}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        {step === "granting"
          ? "Waiting for your approval…"
          : step === "linking"
            ? "Setting up your Hedera account…"
            : "Allow payments"}
      </button>
      {step === "linking" && (
        <p role="status" className="text-xs text-gray-500">
          Creating the Hedera account for your wallet and associating it with USDC. This takes a few
          seconds.
        </p>
      )}
      {step === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          {message}
        </p>
      )}
    </div>
  );
}
