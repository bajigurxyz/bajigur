import { x402Client } from "@x402/core/client";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { describe, expect, it } from "vitest";
import type { Prompt } from "@/lib/api";
import { externalHederaSigner } from "@/lib/hedera";
import { atomic, HBAR, spendPolicy, USDC } from "@/lib/spend";

/** Never signs: the asset is decided before anything reaches the signer. */
const signer = externalHederaSigner(
  "0.0.77",
  "0227e6f71eeb68984a1619c3403d9656266862c4d7812a66f98a23e119b58f320c",
  async () => {
    throw new Error("selection is all this test needs");
  },
);

const prompt = {
  id: "core-features-tabs",
  title: "Core features tabbed showcase",
  tags: [],
  preview: "",
  priceUsd: "1.00",
  priceHbar: "10",
} satisfies Prompt;

/** The real challenge `GET /prompts/:id/unlock` answers with, USDC first. */
const challenge = {
  x402Version: 2,
  error: "Payment required",
  resource: { url: "https://api.example/prompts/p/unlock", description: "", mimeType: "" },
  accepts: [
    { asset: USDC, amount: "1000000" },
    { asset: HBAR, amount: "1000000000" },
  ].map((a) => ({
    scheme: "exact",
    network: "hedera:testnet" as const,
    payTo: "0.0.7275085",
    maxTimeoutSeconds: 300,
    extra: { feePayer: "0.0.7162784" },
    ...a,
  })),
};

/**
 * The asset the policy leaves the client paying. Runs the real filter-then-select
 * pipeline, because the bug this guards against lives in the filter: HBAR was
 * being dropped before any selector could prefer it.
 */
async function chosenAsset(held: Map<string, bigint>) {
  const client = x402Client.fromConfig({
    schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }],
    ...spendPolicy(prompt, held),
  } as never);
  let asset: string | undefined;
  client.onBeforePaymentCreation(async (ctx) => {
    asset = (ctx as { selectedRequirements?: { asset?: string } }).selectedRequirements?.asset;
  });
  await client.createPaymentPayload(challenge as never).catch(() => {});
  return asset;
}

describe("atomic", () => {
  it("scales a decimal price without going through a float", () => {
    expect(atomic("1.00", 6)).toBe("1000000");
    expect(atomic("0.20", 6)).toBe("200000");
    expect(atomic("0.1", 6)).toBe("100000");
    expect(atomic("10", 8)).toBe("1000000000");
  });
});

describe("which asset a purchase is paid in", () => {
  it("pays HBAR when that is all the wallet holds", async () => {
    // x402's default spend controls allow stablecoins only, and they run before
    // the selector, so without HBAR in allowedAssets this comes back as USDC and
    // the purchase fails on a balance the wallet was never going to have.
    expect(await chosenAsset(new Map([[HBAR, 10_722_522_527n]]))).toBe(HBAR);
  });

  it("prefers USDC when the wallet can afford it", async () => {
    const held = new Map([
      [USDC, 2_000_000n],
      [HBAR, 10_722_522_527n],
    ]);
    expect(await chosenAsset(held)).toBe(USDC);
  });

  it("refuses when neither asset covers the price", async () => {
    const held = new Map([
      [USDC, 500_000n],
      [HBAR, 100n],
    ]);
    const { paymentRequirementsSelector } = spendPolicy(prompt, held);
    expect(() => paymentRequirementsSelector(2, challenge.accepts)).toThrowError(
      /costs 1.00 USDC or 10 HBAR, and this wallet holds 0.50 USDC and 0.000001 HBAR/,
    );
  });
});
