"use client";

import { useEffect, useState } from "react";

type State = { phase: "loading" } | { phase: "ready"; name?: string };

/**
 * The name this wallet already owns, read from the chain rather than from a
 * session.
 *
 * `/agent/me` also reports it, but only to a browser holding an agent token,
 * and that token is a cookie scoped to one origin. Signing in somewhere else
 * was enough to make the app forget a name the wallet still owned, show the
 * claim form again, and invite the owner to buy a second one. A name is a
 * property of the wallet, so it is read from the wallet's address.
 */
export function useClaimedName(address?: string): State {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/ens/name?address=${encodeURIComponent(address)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { name?: string }) => {
        if (!cancelled) setState({ phase: "ready", name: data.name });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "ready" });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return address ? state : { phase: "ready" };
}
