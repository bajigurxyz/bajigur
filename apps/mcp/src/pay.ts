import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";

export function paidFetch() {
  const accountId = process.env.HEDERA_OPERATOR_ID;
  const key = process.env.HEDERA_OPERATOR_KEY;
  if (!accountId || !key) throw new Error("set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY");

  const signer = createClientHederaSigner(accountId, PrivateKey.fromStringECDSA(key), {
    network: `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}`,
  });
  const network = `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}` as const;
  const hbar = process.env.X402_PAY_WITH === "hbar";
  const asset = hbar ? "0.0.0" : undefined;
  const maxTinybars = `${BigInt(process.env.X402_MAX_SPEND_HBAR ?? "5") * 100_000_000n}`;
  const client = x402Client.fromConfig({
    schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }],
    spendControls: {
      maxAmountPerPayment: `$${process.env.X402_MAX_SPEND_USD ?? "1"}`,
      allowedAssets: hbar
        ? [{ network, asset: "0.0.0", maxAmountPerPayment: maxTinybars }]
        : undefined,
    },
    paymentRequirementsSelector: (_version, accepts) => {
      const pick = accepts.find((a) => a.asset === asset) ?? accepts[0];
      if (!pick) throw new Error("no payment option offered");
      return pick;
    },
  });
  return wrapFetchWithPayment(fetch, client);
}
