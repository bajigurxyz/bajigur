"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import WalletButton from "@/components/WalletButton";
import { ENS_PARENT } from "@/lib/ens";
import { useAgent } from "@/lib/useAgent";
import { useEmbeddedWallet } from "@/lib/useEmbeddedWallet";
import { useLinkAgent } from "@/lib/useLinkAgent";
import { useNameAvailability } from "@/lib/useNameAvailability";

type Claim = { phase: "idle" } | { phase: "claiming" } | { phase: "error"; message: string };

/**
 * The order is forced by the API, not chosen here.
 *
 * `/ens/claim` authenticates with the agent token and reads the account and
 * public key out of it, so a name cannot be claimed before the wallet is
 * linked. And the wallet cannot be linked before Privy has made one. So it is
 * always wallet, then payments, then name.
 */
const STEPS = ["wallet", "payments", "name"] as const;
type StepName = (typeof STEPS)[number];

function Row({
  index,
  title,
  blurb,
  done,
  active,
  children,
}: {
  index: number;
  title: string;
  blurb: string;
  done: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className={`flex gap-4 ${done || active ? "" : "opacity-50"}`}>
      <span
        aria-hidden
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done ? "bg-black text-white" : "border border-gray-300 text-gray-500"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : index}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-black">{title}</h3>
          <p className="text-sm text-gray-600">{blurb}</p>
        </div>
        {active && children}
      </div>
    </li>
  );
}

/**
 * What a new account has to do before it can buy or sell, in one place.
 *
 * A name is part of it rather than an extra. Its `bajigur.hedera` record is
 * what the 402 reads to decide where a buyer's money goes, so a creator without
 * one publishes prompts that pay the platform, and a buyer without one shows up
 * in a creator's list as an account number. Claiming it here means neither
 * happens by accident.
 */
export default function Onboarding({ onDone }: { onDone?: () => void }) {
  const wallet = useEmbeddedWallet();
  const { state: agent, refresh } = useAgent();
  const { step: linkStep, message: linkMessage, link, busy, access } = useLinkAgent(refresh);

  const [label, setLabel] = useState("");
  const [claim, setClaim] = useState<Claim>({ phase: "idle" });
  const availability = useNameAvailability(label);

  const me = agent.phase === "linked" ? agent.agent : undefined;
  const done: Record<StepName, boolean> = {
    wallet: Boolean(wallet.address),
    payments: Boolean(me),
    name: Boolean(me?.ensName),
  };
  const current = STEPS.find((step) => !done[step]);

  const claimName = async () => {
    setClaim({ phase: "claiming" });
    try {
      const res = await fetch("/api/ens/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = (await res.json()) as { name?: string; error?: string };
      if (res.status === 501) throw new Error("Claiming names is not live yet.");
      if (!res.ok || !data.name) throw new Error(data.error ?? `claim failed (${res.status})`);
      await refresh();
      setClaim({ phase: "idle" });
      onDone?.();
    } catch (err) {
      setClaim({ phase: "error", message: err instanceof Error ? err.message : "Claim failed." });
    }
  };

  if (!current) {
    return (
      <div className="space-y-2 rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2">
          <Check aria-hidden className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-black">You are all set</h2>
        </div>
        <p className="text-sm text-gray-600">
          <code className="font-mono">{me?.ensName}</code> points at{" "}
          <code className="font-mono">{me?.account}</code>. Buyers pay the name, so changing its
          record changes where the money lands.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-8 rounded-2xl border border-gray-200 p-6">
      <Row
        index={1}
        title="A wallet"
        blurb="Privy makes one for you. No seed phrase to keep, no gas to buy."
        done={done.wallet}
        active={current === "wallet"}
      >
        {wallet.address ? null : (
          <div className="space-y-2">
            <WalletButton />
            {wallet.error && (
              <p role="alert" className="text-xs text-red-700">
                {wallet.error}
              </p>
            )}
          </div>
        )}
      </Row>

      <Row
        index={2}
        title="Allow payments"
        blurb="Bajigur signs for you, so an agent can buy without asking every time. Only Bajigur creators can be paid, and you can revoke it in Privy."
        done={done.payments}
        active={current === "payments"}
      >
        <div className="space-y-2">
          {!access.configured && (
            <p
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              Payments are not configured on this deployment: NEXT_PUBLIC_PRIVY_SIGNER_ID is
              missing.
            </p>
          )}
          <button
            type="button"
            onClick={link}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {linkStep === "granting"
              ? "Waiting for your approval…"
              : linkStep === "linking"
                ? "Setting up your Hedera account…"
                : "Allow payments"}
          </button>
          {linkStep === "error" && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              {linkMessage}
            </p>
          )}
        </div>
      </Row>

      <Row
        index={3}
        title="Claim your name"
        blurb={`A name under ${ENS_PARENT} is how buyers pay you. Bajigur registers it on Sepolia and pays the gas, so you stay on Hedera throughout.`}
        done={done.name}
        active={current === "name"}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value.toLowerCase().trim())}
              placeholder="yourname"
              aria-label="Name to claim"
              aria-invalid={availability.phase === "invalid"}
              className="w-40 rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
            />
            <span className="font-mono text-sm text-gray-500">.{ENS_PARENT}</span>
          </div>

          <p aria-live="polite" className="text-xs">
            {availability.phase === "invalid" && (
              <span className="text-red-700">{availability.reason}</span>
            )}
            {availability.phase === "checking" && <span className="text-gray-500">Checking…</span>}
            {availability.phase === "free" && (
              <span className="text-green-700">
                {label}.{ENS_PARENT} is available.
              </span>
            )}
            {availability.phase === "taken" && (
              <span className="text-red-700">Already taken, try another.</span>
            )}
            {availability.phase === "unsupported" && (
              <span className="text-gray-500">Claiming names is not live yet.</span>
            )}
          </p>

          <button
            type="button"
            onClick={claimName}
            disabled={availability.phase !== "free" || claim.phase === "claiming"}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {claim.phase === "claiming" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {claim.phase === "claiming" ? "Registering on Sepolia…" : "Claim"}
          </button>

          {claim.phase === "error" && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              {claim.message}
            </p>
          )}
        </div>
      </Row>
    </ol>
  );
}
