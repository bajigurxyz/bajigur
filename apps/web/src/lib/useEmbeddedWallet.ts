"use client";

import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useState } from "react";

/**
 * The Privy wallet this user signs with, and a way to make one if they have none.
 *
 * Two sources, because they disagree in practice: `useWallets()` lists wallets
 * the SDK has connected this session, while `user.linkedAccounts` is the
 * server's record. Someone who signed in before the app asked for an embedded
 * wallet has neither until they create one, and `createOnLogin` only fires on
 * a fresh login. So the address falls back through both, and `create` exists
 * for the gap.
 */
export function useEmbeddedWallet() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const linked = user?.linkedAccounts.find(
    (account): account is typeof account & { address: string } =>
      account.type === "wallet" && "address" in account,
  );
  const address = connected?.address ?? linked?.address;

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      await createWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creating the wallet failed.");
    } finally {
      setCreating(false);
    }
  };

  return { address, create, creating, error };
}
