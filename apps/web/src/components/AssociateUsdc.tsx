"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

type Step = "idle" | "working" | "done" | "error";

/**
 * Turns on USDC for an account that cannot hold it yet.
 *
 * Only reachable when the API reports `associated: false`, which setting up
 * payments already prevents. It exists for the accounts that got here another
 * way: funded by hand, or an association that failed part way through.
 */
export default function AssociateUsdc({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState("");

  const associate = async () => {
    setStep("working");
    try {
      const res = await fetch("/api/agent/associate", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `association failed (${res.status})`);
      setStep("done");
      onDone?.();
    } catch (err) {
      setStep("error");
      setMessage(err instanceof Error ? err.message : "Could not enable USDC.");
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm text-amber-900">
        This account cannot hold USDC yet. Enabling it takes one transaction, signed by your wallet,
        and costs you nothing.
      </p>
      <button
        type="button"
        onClick={associate}
        disabled={step === "working" || step === "done"}
        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {step === "working" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        {step === "done" ? "USDC enabled" : step === "working" ? "Enabling…" : "Enable USDC"}
      </button>
      {step === "error" && (
        <p role="alert" className="text-xs text-red-800">
          {message}
        </p>
      )}
    </div>
  );
}
