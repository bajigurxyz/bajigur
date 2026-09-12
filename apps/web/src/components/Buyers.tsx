"use client";

import { useEffect, useState } from "react";
import Skeleton, { SkeletonRegion } from "@/components/Skeleton";

const HASHSCAN = "https://hashscan.io/testnet/transaction";

export interface Buyer {
  address: string;
  account?: string;
  /** Their name under bajigur.eth, when they have claimed one. */
  name?: string;
  transactionId: string;
  at: string;
}

type State = { phase: "loading" } | { phase: "ready"; buyers: Buyer[] } | { phase: "unavailable" };

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

const day = (at: string) =>
  new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * Who holds a licence for one prompt.
 *
 * Creator-only at the API, and derived from the ERC-1155 `LicenseIssued` log
 * rather than from our own bookkeeping, so this list cannot drift from who can
 * actually open the prompt.
 *
 * A buyer with a name under bajigur.eth shows as that name. Everyone else shows
 * as their Hedera account, because the account is the identity here and the
 * name is only a label someone chose to put on it.
 */
export default function Buyers({ promptId }: { promptId: string }) {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/prompts/${encodeURIComponent(promptId)}/buyers`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Buyer[]>) : null))
      .then((buyers) => {
        if (cancelled) return;
        setState(buyers ? { phase: "ready", buyers } : { phase: "unavailable" });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [promptId]);

  if (state.phase === "unavailable") return null;

  if (state.phase === "loading") {
    return (
      <SkeletonRegion label="Reading buyers from the chain…" className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-40" />
      </SkeletonRegion>
    );
  }

  if (state.buyers.length === 0) {
    return <p className="text-xs text-gray-500">No licences sold yet.</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-500">
        {state.buyers.length} {state.buyers.length === 1 ? "buyer" : "buyers"}
      </h4>
      <ul className="space-y-1.5">
        {state.buyers.map((buyer) => (
          <li key={buyer.transactionId} className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] break-all text-black">
              {buyer.name ?? buyer.account ?? short(buyer.address)}
            </span>
            <a
              href={`${HASHSCAN}/${buyer.transactionId}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[11px] text-gray-500 underline hover:text-black"
            >
              {day(buyer.at)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
