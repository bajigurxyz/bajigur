"use client";

import { useAgent } from "@/lib/useAgent";
import { useEmbeddedWallet } from "@/lib/useEmbeddedWallet";

export type Onboarding =
  | { phase: "loading" }
  | { phase: "signedOut" }
  | { phase: "incomplete" }
  | { phase: "complete"; name: string };

/**
 * Whether this account can buy and sell yet.
 *
 * Complete means a wallet, a linked Hedera account, and a claimed name. The
 * name is not ceremony: its `bajigur.hedera` record is what a 402 reads to
 * decide where a buyer's money goes, so a creator without one publishes prompts
 * that pay the platform instead of them.
 *
 * Signed out is its own answer rather than "incomplete", because the marketplace
 * is public and a visitor who has not signed in has nothing to finish.
 */
export function useOnboarding(): Onboarding {
  const wallet = useEmbeddedWallet();
  const { state } = useAgent();

  if (state.phase === "loading") return { phase: "loading" };
  if (state.phase === "linked") {
    return state.agent.ensName
      ? { phase: "complete", name: state.agent.ensName }
      : { phase: "incomplete" };
  }
  // No agent token. That is a signed-out visitor if Privy made no wallet
  // either, and someone part way through if it did.
  return wallet.address ? { phase: "incomplete" } : { phase: "signedOut" };
}
