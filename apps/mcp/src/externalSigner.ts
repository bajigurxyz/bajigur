import type { PublicKey } from "@hiero-ledger/sdk";
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

/// Hedera x402 signer for wallets that only expose raw secp256k1 signing (Privy, KMS, hardware).
/// `rawSign` must return the 64-byte r||s signature of keccak256(bodyBytes).
export function externalHederaSigner(
  accountId: string,
  publicKey: PublicKey,
  rawSign: RawSign,
): ClientHederaSigner {
  const payer = AccountId.fromString(accountId);
  return {
    accountId: payer.toString(),
    async createPartiallySignedTransferTransaction(requirements: PaymentRequirements) {
      const feePayer = requirements.extra?.feePayer;
      if (typeof feePayer !== "string")
        throw new Error("feePayer is required in paymentRequirements.extra");
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

export function privyRawSign(walletId: string, appId: string, appSecret: string): RawSign {
  const auth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  return async (bodyBytes) => {
    const res = await fetch(`https://api.privy.io/v1/wallets/${walletId}/raw_sign`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "privy-app-id": appId,
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        params: {
          bytes: `0x${Buffer.from(bodyBytes).toString("hex")}`,
          encoding: "hex",
          hash_function: "keccak256",
        },
      }),
    });
    if (!res.ok) throw new Error(`privy raw_sign ${res.status}: ${await res.text()}`);
    const { data } = (await res.json()) as { data: { signature: string } };
    return Buffer.from(data.signature.replace(/^0x/, ""), "hex").subarray(0, 64);
  };
}
