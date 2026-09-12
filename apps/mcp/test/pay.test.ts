import { afterEach, describe, expect, it } from "bun:test";
import { PrivateKey } from "@hiero-ledger/sdk";
import { x402Client } from "@x402/core/client";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { externalHederaSigner } from "../src/externalSigner";
import { spendPolicy } from "../src/pay";

/**
 * The real challenge `GET /prompts/:id/unlock` answers with. Every prompt is
 * offered in both assets, USDC first, so which one gets paid is entirely the
 * client's choice.
 */
const challenge = {
  x402Version: 2,
  error: "Payment required",
  resource: { url: "https://api.example/prompts/p/unlock", description: "", mimeType: "" },
  accepts: [
    { asset: "0.0.429274", amount: "200000" },
    { asset: "0.0.0", amount: "200000000" },
  ].map((a) => ({
    scheme: "exact",
    network: "hedera:testnet",
    payTo: "0.0.7275085",
    maxTimeoutSeconds: 300,
    extra: { feePayer: "0.0.7162784" },
    ...a,
  })),
};

const key = PrivateKey.generateECDSA();
const signer = externalHederaSigner("0.0.77", key.publicKey, async () => {
  throw new Error("selection is all this test needs");
});

/** The asset the policy leaves the client paying, before anything is signed. */
async function chosenAsset() {
  const client = x402Client.fromConfig({
    schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }],
    ...spendPolicy(),
  } as never);
  let asset: string | undefined;
  client.onBeforePaymentCreation(async (ctx) => {
    asset = (ctx as { selectedRequirements?: { asset?: string } }).selectedRequirements?.asset;
  });
  await client.createPaymentPayload(challenge as never).catch(() => {});
  return asset;
}

afterEach(() => {
  delete process.env.X402_PAY_WITH;
});

describe("which asset a purchase is paid in", () => {
  it("pays HBAR when X402_PAY_WITH asks for it", async () => {
    process.env.X402_PAY_WITH = "hbar";
    // Preferring HBAR is not enough on its own: the default spend controls
    // allow stablecoins only, so without allowedAssets the option is filtered
    // out before the selector ever sees it and USDC wins anyway.
    expect(await chosenAsset()).toBe("0.0.0");
  });

  it("pays USDC otherwise", async () => {
    expect(await chosenAsset()).toBe("0.0.429274");
  });
});
