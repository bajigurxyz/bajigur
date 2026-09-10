import { PublicKey } from "@hiero-ledger/sdk";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { sha256 } from "@noble/hashes/sha256";
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

async function privyRequest(path: string, appId: string, appSecret: string, body?: unknown) {
  const auth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const res = await fetch(`https://api.privy.io/v1/wallets/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "content-type": "application/json",
      "privy-app-id": appId,
      authorization: `Basic ${auth}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`privy ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

// Ethereum wallets refuse /raw_sign; the secp256k1_sign RPC signs a 32-byte hash and returns r||s||v.
async function privySignHash(walletId: string, appId: string, appSecret: string, hash: Uint8Array) {
  const { data } = (await privyRequest(`${walletId}/rpc`, appId, appSecret, {
    method: "secp256k1_sign",
    params: { hash: `0x${Buffer.from(hash).toString("hex")}` },
  })) as { data: { signature: string } };
  return Buffer.from(data.signature.replace(/^0x/, ""), "hex");
}

export function privyRawSign(walletId: string, appId: string, appSecret: string): RawSign {
  return async (bodyBytes) =>
    (await privySignHash(walletId, appId, appSecret, keccak_256(bodyBytes))).subarray(0, 64);
}

// Privy does not expose the public key of ethereum wallets, so recover it from a signature over a fixed hash.
export async function privyWallet(walletId: string, appId: string, appSecret: string) {
  const { address } = (await privyRequest(walletId, appId, appSecret)) as { address: string };
  const hash = sha256(Buffer.from("bajigur:privy:public-key"));
  const sig = await privySignHash(walletId, appId, appSecret, hash);
  const v = sig[64] ?? 0;
  const recovered = secp256k1.Signature.fromCompact(sig.subarray(0, 64))
    .addRecoveryBit(v >= 27 ? v - 27 : v)
    .recoverPublicKey(hash);
  const publicKey = PublicKey.fromBytesECDSA(recovered.toRawBytes(true));
  if (`0x${publicKey.toEvmAddress()}`.toLowerCase() !== address.toLowerCase()) {
    throw new Error("recovered public key does not match the Privy wallet address");
  }
  return { address, publicKey };
}
