"use client";

import { useAgent } from "@/lib/useAgent";
import { useClaimedName } from "@/lib/useClaimedName";
import { useEmbeddedWallet } from "@/lib/useEmbeddedWallet";

export type Onboarding =
  | { phase: "loading" }
  | { phase: "signedOut" }
  | { phase: "incomplete" }
  | { phase: "complete"; name: string };

/**
 * Whether this account has finished setting up.
 *
 * A claimed name is the whole answer, and it is read from the chain rather than
 * from the session. `/agent/me` reports it too, but only to a browser holding
 * an agent token, and that token is a cookie scoped to one origin. Reading it
 * only from there meant signing in on a different host made a wallet that
 * already owned a name look like it had never claimed one: the app showed the
 * claim form again and offered its owner a second name.
 *
 * One onchain fact is enough because a name cannot exist without the steps
 * before it. `/ens/claim` reads the account and public key out of the agent
 * token, so a wallet holding a name has already been created, linked, and given
 * a Hedera account.
 *
 * The name is not ceremony either: its `bajigur.hedera` record is what a 402
 * reads to decide where a buyer's money goes, so a creator without one
 * publishes prompts that pay the platform instead of them.
 *
 * Signed out is its own answer rather than "incomplete", because the
 * marketplace is public and a visitor who has not signed in has nothing to
 * finish.
 */
export function useOnboarding(): Onboarding {
  const wallet = useEmbeddedWallet();
  const { state } = useAgent();
  const claimed = useClaimedName(wallet.address);

  if (state.phase === "loading" || claimed.phase === "loading") return { phase: "loading" };

  const name = (state.phase === "linked" ? state.agent.ensName : undefined) ?? claimed.name;
  if (name) return { phase: "complete", name };

  // No name and no agent token: a signed-out visitor if Privy made no wallet
  // either, and someone part way through if it did.
  if (state.phase !== "linked" && !wallet.address) return { phase: "signedOut" };
  return { phase: "incomplete" };
}
