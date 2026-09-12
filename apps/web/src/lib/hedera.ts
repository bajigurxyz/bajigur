import { PublicKey } from "@hiero-ledger/sdk";
import type { PaymentRequirements } from "@x402/core/types";
import {
  AccountId,
  type ClientHederaSigner,
  createHederaClient,
  Hbar,
  TokenId,
  TransactionId,
  TransferTransaction,
} from "@x402/hedera";

export type RawSign = (bodyBytes: Uint8Array) => Promise<Uint8Array>;

/**
 * Hedera x402 signer for a wallet that only exposes raw secp256k1 signing.
 *
 * This mirrors `externalHederaSigner` in apps/mcp/src/externalSigner.ts on
 * purpose: apps do not import from each other, and the two callers sit either
 * side of the same protocol. If one changes, change both — or lift the pair
 * into packages/.
 *
 * `rawSign` must return the 64-byte r||s signature of keccak256(bodyBytes);
 * here that round trip goes to apps/api, which signs through Privy.
 */
export function externalHederaSigner(
  accountId: string,
  publicKeyHex: string,
  rawSign: RawSign,
): ClientHederaSigner {
  const payer = AccountId.fromString(accountId);
  const publicKey = PublicKey.fromStringECDSA(publicKeyHex);
  return {
    accountId: payer.toString(),
    async createPartiallySignedTransferTransaction(requirements: PaymentRequirements) {
      const feePayer = requirements.extra?.feePayer;
      if (typeof feePayer !== "string") {
        throw new Error("feePayer is required in paymentRequirements.extra");
      }
      const amount = BigInt(requirements.amount);
      const payTo = AccountId.fromString(requirements.payTo);
      const tx = new TransferTransaction();
      if (requirements.asset === "0.0.0") {
        tx.addHbarTransfer(payer, Hbar.fromTinybars((-amount).toString()));
        tx.addHbarTransfer(payTo, Hbar.fromTinybars(amount.toString()));
      } else {
        const token = TokenId.fromString(requirements.asset);
        tx.addTokenTransfer(token, payer, Number(-amount));
        tx.addTokenTransfer(token, payTo, Number(amount));
      }
      // The facilitator pays the fee, so the transaction id is minted under
      // its account, not the payer's.
      tx.setTransactionId(TransactionId.generate(AccountId.fromString(feePayer)));
      const client = createHederaClient(requirements.network);
      try {
        tx.freezeWith(client);
        await tx.signWith(publicKey, rawSign);
        return Buffer.from(tx.toBytes()).toString("base64");
      } finally {
        client.close();
      }
    },
  };
}

/** The Hedera transaction id apps/api reports back in the PAYMENT-RESPONSE header. */
export function transactionIdOf(header: string | null): string | undefined {
  if (!header) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as {
      transaction?: string;
    };
    return decoded.transaction;
  } catch {
    // A header we cannot read is not worth failing a paid request over.
    return undefined;
  }
}
