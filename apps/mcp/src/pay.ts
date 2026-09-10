import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";

export function wallet() {
  const accountId = process.env.HEDERA_OPERATOR_ID;
  const key = process.env.HEDERA_OPERATOR_KEY;
  if (!accountId || !key) throw new Error("set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY");
  return { accountId, key: PrivateKey.fromStringECDSA(key) };
}

// Proves wallet ownership so the API can skip the 402 for licence holders.
export function identityHeaders({ accountId, key }: ReturnType<typeof wallet>) {
  const timestamp = `${Date.now()}`;
  const signature = Buffer.from(
    key.sign(Buffer.from(`bajigur:${accountId}:${timestamp}`)),
  ).toString("hex");
  return {
    "x-hedera-account": accountId,
    "x-hedera-timestamp": timestamp,
    "x-hedera-signature": signature,
  };
}

export function paidFetch() {
  const { accountId, key } = wallet();
  const signer = createClientHederaSigner(accountId, key, {
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
  const paying = wrapFetchWithPayment(fetch, client);
  return (input: string | URL, init?: RequestInit) =>
    paying(input, {
      ...init,
      headers: { ...init?.headers, ...identityHeaders({ accountId, key }) },
    });
}
