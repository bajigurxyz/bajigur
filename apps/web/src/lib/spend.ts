import type { SelectPaymentRequirements } from "@x402/core/client";
import type { Prompt } from "@/lib/api";

export const HBAR = "0.0.0";
export const USDC = process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274";

const NETWORK = `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}` as const;

/**
 * A decimal price string in the asset's atomic units: `atomic("1.00", 6)` is
 * `"1000000"`. Done on the string rather than through a float, because 0.1 USDC
 * is not representable in binary and a payment that is one unit off is refused.
 */
export function atomic(decimal: string, places: number) {
  const [whole, fraction = ""] = decimal.split(".");
  return BigInt(`${whole}${fraction.padEnd(places, "0").slice(0, places)}`).toString();
}

/**
 * How much of which asset this purchase may spend.
 *
 * Both assets have to be named. x402's default spend controls allow stablecoins
 * only and they run *before* the selector, so leaving HBAR out of `allowedAssets`
 * silently drops it from the offer: a wallet holding nothing but HBAR is then
 * told it cannot afford a prompt it can plainly afford.
 *
 * The caps are the prices the catalogue advertised, one per asset, so a 402
 * asking for more than the user was shown is refused before anything is signed.
 *
 * @param held Atomic balances by asset id, from the mirror node.
 */
export function spendPolicy(prompt: Prompt, held: Map<string, bigint>) {
  return {
    spendControls: {
      maxAmountPerPayment: `$${prompt.priceUsd}`,
      allowedAssets: [
        { network: NETWORK, asset: USDC, maxAmountPerPayment: atomic(prompt.priceUsd, 6) },
        { network: NETWORK, asset: HBAR, maxAmountPerPayment: atomic(prompt.priceHbar, 8) },
      ],
    },
    // Pay with something the wallet actually holds. USDC first, because the
    // price is quoted in dollars, but HBAR is a real option rather than a
    // fallback of last resort.
    paymentRequirementsSelector: ((_version, accepts) => {
      const affordable = accepts.filter((a) => (held.get(a.asset) ?? 0n) >= BigInt(a.amount));
      const pick = affordable.find((a) => a.asset !== HBAR) ?? affordable[0];
      if (!pick) throw new Error(`Not enough balance. ${shortfall(accepts, held)}`);
      return pick;
    }) satisfies SelectPaymentRequirements,
  };
}

/** Says what the prompt costs and what the wallet has, in that order. */
function shortfall(accepts: { asset: string; amount: string }[], held: Map<string, bigint>) {
  const say = (asset: string, atomicAmount: bigint) =>
    asset === HBAR
      ? `${Number(atomicAmount) / 1e8} HBAR`
      : `${(Number(atomicAmount) / 1e6).toFixed(2)} USDC`;
  const price = accepts.map((a) => say(a.asset, BigInt(a.amount))).join(" or ");
  const have = accepts.map((a) => say(a.asset, held.get(a.asset) ?? 0n)).join(" and ");
  return `This prompt costs ${price}, and this wallet holds ${have}.`;
}
