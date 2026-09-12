"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { ENS_PARENT, labelError } from "@/lib/ens";

type Availability =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "free" }
  | { phase: "taken" }
  | { phase: "unsupported" };

type Claim =
  | { phase: "idle" }
  | { phase: "claiming" }
  | { phase: "done"; name: string }
  | { phase: "error"; message: string };

/**
 * Claims a name under the parent, e.g. axel.bajigur.eth.
 *
 * The registration happens on Sepolia, but apps/api pays for and sends that
 * transaction, so the user stays on Hedera throughout and never needs Sepolia
 * ETH. All this surface does is pick a label.
 *
 * The name is not decoration. Its `bajigur.hedera` text record is what the 402
 * reads to decide where a buyer's money goes, so claiming one is what makes
 * someone a creator who can be paid.
 */
export default function ClaimEnsName({
  current,
  account,
  onClaimed,
}: {
  current?: string;
  account?: string;
  onClaimed?: () => void;
}) {
  const [label, setLabel] = useState("");
  const [available, setAvailable] = useState<Availability>({ phase: "idle" });
  const [claim, setClaim] = useState<Claim>({ phase: "idle" });

  const invalid = label ? labelError(label) : undefined;
  const claimed = current ?? (claim.phase === "done" ? claim.name : undefined);

  if (claimed) {
    return (
      <div className="space-y-2 rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2">
          <Check aria-hidden className="h-4 w-4" />
          <code className="font-mono text-sm font-semibold text-black">{claimed}</code>
        </div>
        <p className="text-xs text-gray-500">
          Buyers pay this name, not an account number. Its record points at{" "}
          <code className="font-mono">{account ?? "your Hedera account"}</code>, so changing the
          record changes where the money lands.
        </p>
      </div>
    );
  }

  const check = async (next: string) => {
    setLabel(next);
    setAvailable({ phase: "idle" });
    if (labelError(next)) return;
    setAvailable({ phase: "checking" });
    try {
      const res = await fetch(`/api/ens/available?label=${encodeURIComponent(next)}`);
      if (res.status === 501) {
        setAvailable({ phase: "unsupported" });
        return;
      }
      const data = (await res.json()) as { available?: boolean };
      setAvailable({ phase: data.available ? "free" : "taken" });
    } catch {
      setAvailable({ phase: "idle" });
    }
  };

  const submit = async () => {
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
      setClaim({ phase: "done", name: data.name });
      onClaimed?.();
    } catch (err) {
      setClaim({ phase: "error", message: err instanceof Error ? err.message : "Claim failed." });
    }
  };

  const canClaim = Boolean(label) && !invalid && available.phase === "free";

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-black">Claim your name</h3>
        <p className="text-sm text-gray-600">
          A name under {ENS_PARENT} is how buyers pay you. Bajigur registers it for you, so you stay
          on Hedera and need no Sepolia ETH.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={label}
          onChange={(event) => check(event.target.value.toLowerCase().trim())}
          placeholder="yourname"
          aria-label="Name to claim"
          aria-invalid={Boolean(invalid)}
          className="w-40 rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
        />
        <span className="font-mono text-sm text-gray-500">.{ENS_PARENT}</span>
      </div>

      <p aria-live="polite" className="text-xs">
        {invalid && <span className="text-red-700">{invalid}</span>}
        {!invalid && available.phase === "checking" && (
          <span className="text-gray-500">Checking…</span>
        )}
        {!invalid && available.phase === "free" && (
          <span className="text-green-700">
            {label}.{ENS_PARENT} is available.
          </span>
        )}
        {!invalid && available.phase === "taken" && (
          <span className="text-red-700">Already taken.</span>
        )}
        {available.phase === "unsupported" && (
          <span className="text-gray-500">Claiming names is not live yet.</span>
        )}
      </p>

      <button
        type="button"
        onClick={submit}
        disabled={!canClaim || claim.phase === "claiming"}
        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {claim.phase === "claiming" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        {claim.phase === "claiming" ? "Claiming…" : "Claim"}
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
  );
}
