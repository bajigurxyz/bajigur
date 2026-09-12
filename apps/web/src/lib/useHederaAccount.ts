"use client";

import { useEffect, useState } from "react";

export interface HederaAccount {
  exists: boolean;
  network: string;
  account?: string;
  address?: string;
  hbar?: string;
  usdc?: string;
}

type State = { phase: "loading" } | { phase: "ready"; account: HederaAccount };

/**
 * The Hedera account for a wallet address, if the chain has one yet.
 *
 * Read without the agent token, so the account and its balances appear as soon
 * as they exist rather than only after payments have been set up.
 */
export function useHederaAccount(address?: string) {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/hedera/account?address=${encodeURIComponent(address)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((account: HederaAccount) => {
        if (!cancelled) setState({ phase: "ready", account });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "ready", account: { exists: false, network: "" } });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return state;
}
