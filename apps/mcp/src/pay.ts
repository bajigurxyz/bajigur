import { PublicKey } from "@hiero-ledger/sdk";
import type { SelectPaymentRequirements } from "@x402/core/client";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { externalHederaSigner } from "./externalSigner";

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

/**
 * Which of the offered assets to pay with, and the caps that go with it.
 *
 * Both wallets need this, so it lives in one place: they offer the same
 * catalogue at the same prices, and paying HBAR from one client and USDC from
 * the other for the same prompt is a difference nobody asked for.
 *
 * The API offers USDC and HBAR for every prompt. x402 picks the first accept it
 * is left with, and its default spend controls allow stablecoins only, so
 * without both halves below HBAR is never reachable: `allowedAssets` is what
 * lets it through the filter, and the selector is what prefers it.
 *
 * Set `X402_PAY_WITH=hbar` to pay in HBAR. Anything else keeps USDC.
 */
export function spendPolicy() {
  const network = `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}` as const;
  const hbar = process.env.X402_PAY_WITH === "hbar";
  const maxTinybars = `${BigInt(process.env.X402_MAX_SPEND_HBAR ?? "5") * 100_000_000n}`;
  return {
    spendControls: {
      maxAmountPerPayment: `$${process.env.X402_MAX_SPEND_USD ?? "1"}`,
      allowedAssets: hbar
        ? [{ network, asset: "0.0.0", maxAmountPerPayment: maxTinybars }]
        : undefined,
    },
    paymentRequirementsSelector: ((_version, accepts) => {
      const pick = hbar ? (accepts.find((a) => a.asset === "0.0.0") ?? accepts[0]) : accepts[0];
      if (!pick) throw new Error("no payment option offered");
      return pick;
    }) satisfies SelectPaymentRequirements,
  };
}

export function paidFetch() {
  const { accountId, key } = wallet();
  const signer = createClientHederaSigner(accountId, key, {
    network: `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}`,
  });
  const client = x402Client.fromConfig({
    schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }],
    ...spendPolicy(),
  });
  const paying = wrapFetchWithPayment(fetch, client);
  return (input: string | URL, init?: RequestInit) =>
    paying(input, {
      ...init,
      headers: { ...init?.headers, ...identityHeaders({ accountId, key }) },
    });
}

/// Agent-token mode: the API signs with the user's delegated Privy wallet; no key on this machine.
export async function agentWallet(api: string, token: string) {
  const headers = { authorization: `Bearer ${token}` };
  const res = await fetch(`${api}/agent/me`, { headers });
  if (!res.ok) throw new Error(`agent token rejected: ${res.status} ${await res.text()}`);
  const me = (await res.json()) as { account: string; publicKey: string };
  const signer = externalHederaSigner(
    me.account,
    PublicKey.fromStringECDSA(me.publicKey),
    async (bodyBytes) => {
      const r = await fetch(`${api}/agent/sign`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ bodyBytes: Buffer.from(bodyBytes).toString("base64") }),
      });
      if (!r.ok) throw new Error(`api refused to sign: ${r.status} ${await r.text()}`);
      const { signature } = (await r.json()) as { signature: string };
      return Buffer.from(signature, "hex");
    },
  );
  const client = x402Client.fromConfig({
    schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }],
    ...spendPolicy(),
  });
  const paying = wrapFetchWithPayment(fetch, client);
  const paid = (input: string | URL, init?: RequestInit) =>
    paying(input, { ...init, headers: { ...init?.headers, ...headers } });
  return { account: me.account, paid };
}
