"use client";

import { useEffect, useState } from "react";

export interface Balances {
  account: string;
  address: string | null;
  cap: string;
  network: string;
  hbar: string | null;
  usdc: string | null;
  usdcTokenId?: string;
}

type State =
  | { phase: "loading" }
  | { phase: "ready"; balances: Balances }
  | { phase: "unavailable" };

/** What the wallet holds on Hedera, read through our own server. */
export function useBalances(enabled: boolean) {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/agent/balances")
      .then((res) =>
        res.ok
          ? res.json().then((balances: Balances) => {
              if (!cancelled) setState({ phase: "ready", balances });
            })
          : Promise.reject(new Error(String(res.status))),
      )
      .catch(() => {
        if (!cancelled) setState({ phase: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
