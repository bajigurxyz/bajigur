"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { useWalletAccess } from "@/lib/useWalletAccess";

export type LinkStep = "idle" | "granting" | "linking" | "error";

/**
 * Granting Bajigur signing access, then linking the wallet to a Hedera account.
 *
 * Two steps that are never useful apart: without the signer, `/agent/link` has
 * nothing it is allowed to sign with, and without the link there is no agent
 * token and no Hedera account. Both `/connect` and onboarding run exactly this,
 * so it lives here rather than being written twice and drifting.
 */
export function useLinkAgent(onLinked?: () => void | Promise<void>) {
  const { getAccessToken } = usePrivy();
  const access = useWalletAccess();
  const [step, setStep] = useState<LinkStep>("idle");
  const [message, setMessage] = useState("");

  const link = async () => {
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
      await onLinked?.();
      setStep("idle");
    } catch (err) {
      setStep("error");
      setMessage(err instanceof Error ? err.message : "Connecting the wallet failed.");
    }
  };

  return { access, step, message, link, busy: step === "granting" || step === "linking" };
}
