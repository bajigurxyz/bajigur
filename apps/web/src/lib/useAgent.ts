"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentIdentity } from "@/lib/agent";

export type AgentState =
  | { phase: "loading" }
  | { phase: "linked"; agent: AgentIdentity }
  | { phase: "unlinked" };

/** One read of /api/agent/me, as a promise so callers decide what to do with it. */
function readAgent(): Promise<AgentState> {
  // no-store: a linked wallet and its balances change under the same URL, and
  // a cached answer is how the profile ends up offering to activate an account
  // that already exists.
  return fetch("/api/agent/me", { cache: "no-store" })
    .then((res) =>
      res.ok
        ? res.json().then((agent: AgentIdentity) => ({ phase: "linked", agent }) as AgentState)
        : ({ phase: "unlinked" } as AgentState),
    )
    .catch(() => ({ phase: "unlinked" }) as AgentState);
}

/**
 * Whether this browser has a usable agent token, and who it belongs to.
 *
 * The token itself lives in an httpOnly cookie, so the only way to know is to
 * ask our own server — which is also the only thing that can tell whether
 * apps/api still accepts it.
 *
 * State is only ever set from a promise callback, never synchronously in the
 * effect body: `react-hooks/set-state-in-effect` is enforced here.
 */
export function useAgent() {
  const [state, setState] = useState<AgentState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    readAgent().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Re-read after linking. Called from handlers, so resetting to loading is fine. */
  const refresh = useCallback(async () => {
    setState({ phase: "loading" });
    setState(await readAgent());
  }, []);

  return { state, refresh };
}
