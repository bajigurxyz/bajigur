"use client";

import { useCallback } from "react";
import { useLinkAgent } from "@/lib/useLinkAgent";

/**
 * Makes sure this browser holds an agent token before something needs one.
 *
 * The token is a cookie, so it belongs to one origin. A wallet that was linked
 * on localhost, or in another browser, arrives here with a name, a Hedera
 * account and a licence history, and no token at all. Onboarding is rightly
 * skipped for them, and then buying or publishing used to fail with "set up
 * payments" as if none of it had happened.
 *
 * Linking again is cheap and idempotent: Privy already holds the signer, so
 * `addSigners` returns "already exists" and `/agent/link` reissues the token for
 * this origin. Doing it at the point of use, rather than sending someone back
 * through a flow they finished weeks ago, is the difference between a pause and
 * a wall.
 */
export function useAgentSession() {
  const { link, step, message } = useLinkAgent();

  const ensure = useCallback(async () => {
    const res = await fetch("/api/agent/me", { cache: "no-store" });
    if (res.ok) return true;
    await link();
    // `link` swallows its own failure into state, so ask again rather than
    // trusting it: a second 401 means the caller should show its own error.
    return (await fetch("/api/agent/me", { cache: "no-store" })).ok;
  }, [link]);

  return { ensure, linking: step === "granting" || step === "linking", message };
}
