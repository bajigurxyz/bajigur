"use client";

import { usePrivy, useSigners } from "@privy-io/react-auth";
import { useEmbeddedWallet } from "@/lib/useEmbeddedWallet";

/**
 * The key quorum Bajigur signs with, created in the Privy dashboard under
 * Authorization keys. Required: this app's wallets run in a TEE, where the
 * only way to grant server-side signing is to add that quorum as a signer.
 */
export const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID ?? "";

/**
 * Grants Bajigur permission to sign for the user's wallet.
 *
 * Not `useDelegatedActions`: that hook only works for apps whose wallets are
 * reassembled on the user's device. These are reassembled inside a secure
 * enclave, and it throws outright. The TEE equivalent is a signer, which is a
 * key quorum the server holds a private key for.
 *
 * Adding a signer that is already there is not an error worth stopping for,
 * so a failure here is carried forward rather than thrown: linking is what
 * actually proves whether access was granted, and its error is the one worth
 * showing.
 */
export function useWalletAccess() {
  const { user } = usePrivy();
  const { addSigners } = useSigners();
  const wallet = useEmbeddedWallet();

  const hasSigner = user?.linkedAccounts.some(
    (account) => account.type === "wallet" && "delegated" in account && account.delegated,
  );

  const grant = async () => {
    if (!SIGNER_ID) {
      throw new Error(
        "Payments are not configured: NEXT_PUBLIC_PRIVY_SIGNER_ID is missing. Create a key quorum in the Privy dashboard under Authorization keys and set its id.",
      );
    }
    let address = wallet.address;
    if (!address) {
      await wallet.create();
      address = wallet.address;
      if (!address) throw new Error("Could not create a wallet for you.");
    }
    try {
      await addSigners({ address, signers: [{ signerId: SIGNER_ID }] });
    } catch (err) {
      // Granting twice is harmless and must not block, but anything else is
      // the real reason payments will not work, so it has to be visible
      // rather than buried in a console warning.
      const message = err instanceof Error ? err.message : String(err);
      if (!/already|exists|duplicate/i.test(message)) {
        throw new Error(`Privy refused to add Bajigur as a signer: ${message}`);
      }
    }
    return address;
  };

  return { address: wallet.address, hasSigner, grant, configured: Boolean(SIGNER_ID) };
}
