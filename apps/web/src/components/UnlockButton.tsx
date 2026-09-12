"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CopyButton from "@/components/CopyButton";
import { formatHbar, formatUsd, type Prompt } from "@/lib/api";

type Phase =
  | { kind: "idle" }
  | { kind: "paying" }
  | { kind: "unlocked"; body: string; transaction?: string }
  | { kind: "error"; message: string };

const HASHSCAN = "https://hashscan.io/testnet/transaction";

/**
 * Buys one prompt, or opens it again if the wallet already holds its licence.
 *
 * The whole payment happens in /api/unlock/[id] on this app's own server: the
 * x402 challenge rides in a response header the browser is not allowed to read
 * cross-origin, and the agent token that authorises signing must never reach
 * client JavaScript. So this control has no wallet plumbing in it at all — it
 * posts, and names what came back.
 *
 * Invariants worth keeping:
 * - The "no gas, no seed phrase" line is inline copy, rendered BEFORE the user
 *   commits, never a tooltip.
 * - `paying` is a named state; a settling payment is a real wait, not a spinner
 *   with nothing behind it.
 * - A failure leaves the prompt locked and says which step refused.
 */
export default function UnlockButton({ prompt, linked }: { prompt: Prompt; linked: boolean }) {
  const { authenticated } = usePrivy();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const unlock = async () => {
    setPhase({ kind: "paying" });
    try {
      const res = await fetch(`/api/unlock/${encodeURIComponent(prompt.id)}`, { method: "POST" });
      const data = (await res.json()) as { body?: string; transaction?: string; error?: string };
      if (!res.ok || !data.body) {
        setPhase({ kind: "error", message: data.error ?? `Unlock failed (${res.status})` });
        return;
      }
      setPhase({ kind: "unlocked", body: data.body, transaction: data.transaction });
    } catch {
      setPhase({ kind: "error", message: "The unlock request never reached the server." });
    }
  };

  if (phase.kind === "unlocked") {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl bg-gray-950">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
            <span className="text-xs text-gray-400">{prompt.title}</span>
            <CopyButton
              text={phase.body}
              label={`the ${prompt.title} prompt`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            />
          </div>
          <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-gray-100">
            <code>{phase.body}</code>
          </pre>
        </div>
        <p className="text-xs text-gray-500">
          Yours for good. The licence is an ERC-1155 token in your wallet, so this prompt opens free
          from any client now.
          {phase.transaction && (
            <>
              {" "}
              <a
                href={`${HASHSCAN}/${phase.transaction.replace(/[@.]/g, "-")}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-black"
              >
                View the payment on HashScan
              </a>
            </>
          )}
        </p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Sign in to buy this prompt.</p>
        <Link
          href="/connect"
          className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Lock aria-hidden className="h-4 w-4" />
          Sign in to unlock
        </Link>
      </div>
    );
  }

  if (!linked) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          One more step: delegate your wallet to Bajigur so it can pay on your behalf, capped per
          payment.
        </p>
        <Link
          href="/connect"
          className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Set up payments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={unlock}
        disabled={phase.kind === "paying"}
        className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {phase.kind === "paying" ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Unlock aria-hidden className="h-4 w-4" />
        )}
        {phase.kind === "paying" ? "Paying…" : `Unlock for ${formatUsd(prompt.priceUsd)}`}
      </button>

      <p className="text-xs text-gray-500">
        {formatUsd(prompt.priceUsd)} in USDC, or {formatHbar(prompt.priceHbar)} (Hedera&apos;s
        native currency), paid straight to {prompt.creator ?? "the creator"}. No gas: the
        facilitator covers the Hedera fee.
      </p>

      {phase.kind === "paying" && (
        <p role="status" className="text-xs text-gray-500">
          Signing and settling on Hedera. This takes a few seconds.
        </p>
      )}

      {phase.kind === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          {phase.message} The prompt is still locked; nothing was charged unless the message says
          otherwise.
        </p>
      )}
    </div>
  );
}
