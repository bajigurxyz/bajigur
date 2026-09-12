"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import CopyButton from "@/components/CopyButton";
import WalletButton from "@/components/WalletButton";
import { API_BASE } from "@/lib/api";
import { useAgent } from "@/lib/useAgent";
import { useWalletAccess } from "@/lib/useWalletAccess";

type Step = "idle" | "granting" | "linking" | "error";

function claudeConfig(token: string) {
  return `{
  "mcpServers": {
    "bajigur": {
      "command": "bun",
      "args": ["/absolute/path/to/bajigur/apps/mcp/src/index.ts"],
      "env": {
        "BAJIGUR_API_URL": "${API_BASE}",
        "BAJIGUR_AGENT_TOKEN": "${token}"
      }
    }
  }
}`;
}

/**
 * The three states between signing in and an agent that can spend: signed out,
 * signed in without access granted, and linked.
 *
 * Granting access is the part that deserves explaining, since the user is
 * letting a service move their money, so the caps and the revocation path are
 * stated on the control itself, before they agree.
 */
export default function ConnectPanel() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const access = useWalletAccess();
  const { state, refresh } = useAgent();
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const connect = async () => {
    setStep("granting");
    setMessage("");
    try {
      await access.grant();
      setStep("linking");
      const privyAccessToken = await getAccessToken();
      if (!privyAccessToken) throw new Error("Privy returned no access token");
      const res = await fetch("/api/agent/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ privyAccessToken }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `linking failed (${res.status})`);
      await refresh();
      setStep("idle");
    } catch (err) {
      setStep("error");
      setMessage(err instanceof Error ? err.message : "Connecting the wallet failed.");
    }
  };

  const revealToken = async () => {
    const res = await fetch("/api/agent/token");
    if (!res.ok) return;
    setToken(((await res.json()) as { token: string }).token);
  };

  if (!ready) return <p className="text-sm text-gray-500">Loading…</p>;

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
          <h2 className="text-lg font-medium">Use it from Claude Desktop</h2>
          <p className="text-sm text-gray-600">
            Paste this into <code className="font-mono text-xs">claude_desktop_config.json</code>,
            restart Claude, and ask it to find and buy a prompt. Your agent pays from this wallet,
            never above the cap, and you hold no key.
          </p>
          {token ? (
            <div className="overflow-hidden rounded-2xl bg-gray-950">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
                <span className="text-xs text-gray-400">claude_desktop_config.json</span>
                <CopyButton
                  text={claudeConfig(token)}
                  label="the Claude Desktop config"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                />
              </div>
              <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-100">
                <code>{claudeConfig(token)}</code>
              </pre>
            </div>
          ) : (
            <button
              type="button"
              onClick={revealToken}
              className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-black transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Show my agent token
            </button>
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
        disabled={step === "granting" || step === "linking"}
        className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {(step === "granting" || step === "linking") && (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        )}
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
