import { describe, expect, it } from "bun:test";
import { PrivateKey, Transaction } from "@hiero-ledger/sdk";
import { externalHederaSigner } from "../src/externalSigner";

const key = PrivateKey.generateECDSA();
const requirements = {
  scheme: "exact",
  network: "hedera:testnet" as const,
  asset: "0.0.429274",
  amount: "20000",
  payTo: "0.0.7275085",
  maxTimeoutSeconds: 300,
  extra: { feePayer: "0.0.999" },
};

describe("externalHederaSigner", () => {
  it("produces a transfer the payer's public key verifies, signed only through rawSign", async () => {
    let calls = 0;
    const signer = externalHederaSigner("0.0.1234", key.publicKey, async (bodyBytes) => {
      calls++;
      return key.sign(bodyBytes);
    });
    const base64 = await signer.createPartiallySignedTransferTransaction(requirements);
    const tx = Transaction.fromBytes(Buffer.from(base64, "base64"));
    expect(calls).toBeGreaterThan(0);
    expect(key.publicKey.verifyTransaction(tx)).toBe(true);
    expect(PrivateKey.generateECDSA().publicKey.verifyTransaction(tx)).toBe(false);
    expect(tx.transactionId?.accountId?.toString()).toBe("0.0.999");
  });
});
