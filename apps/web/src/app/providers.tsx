"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

/**
 * Privy is the only wallet layer: users sign in with email or a social
 * account and get an embedded wallet they never have to fund with gas.
 *
 * There is deliberately no wagmi/viem provider underneath. Bajigur settles on
 * Hedera, not an EVM JSON-RPC chain: payments are Hedera `TransferTransaction`s
 * signed through the delegated wallet by apps/api (see app/api/unlock), so the
 * browser never builds, signs, or broadcasts a transaction itself.
 */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export default function Providers({ children }: { children: ReactNode }) {
  // Without an app id PrivyProvider throws on mount and takes the whole tree
  // with it. The catalogue is public, so degrade to a wallet-less app instead:
  // every surface that needs an account says so on its own.
  if (!PRIVY_APP_ID) return <>{children}</>;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Embedded wallets only. An injected wallet could not sign a Hedera
        // transaction through Privy's delegated signer, so offering one would
        // be a dead end dressed up as a choice.
        loginMethods: ["email", "google", "github"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: { theme: "light", accentColor: "#000000", walletChainType: "ethereum-only" },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
