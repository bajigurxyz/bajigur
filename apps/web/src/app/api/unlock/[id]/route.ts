import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE, type AgentIdentity } from "@/lib/agent";
import { API_BASE, fetchPrompt, unlockUrl } from "@/lib/api";
import { externalHederaSigner, transactionIdOf } from "@/lib/hedera";
import { HBAR, spendPolicy } from "@/lib/spend";

const NETWORK = process.env.HEDERA_NETWORK ?? "testnet";
const MIRROR = `https://${NETWORK}.mirrornode.hedera.com/api/v1`;

/** What this account can actually spend, in each asset's atomic units. */
async function balances(account: string) {
  const res = await fetch(`${MIRROR}/accounts/${account}`, { cache: "no-store" });
  if (!res.ok) return new Map<string, bigint>();
  const mirror = (await res.json()) as {
    balance?: { balance?: number; tokens?: { token_id: string; balance: number }[] };
  };
  const held = new Map<string, bigint>([[HBAR, BigInt(mirror.balance?.balance ?? 0)]]);
  for (const token of mirror.balance?.tokens ?? []) held.set(token.token_id, BigInt(token.balance));
  return held;
}

/**
 * Buys one prompt over x402 on Hedera, server side.
 *
 * Why not from the browser: the x402 challenge travels in the `PAYMENT-REQUIRED`
 * response header, and apps/api does not list it in Access-Control-Expose-Headers,
 * so `fetch` in a page literally cannot read it cross-origin. Doing it here also
 * keeps the agent token out of client JavaScript and keeps the Hedera SDK out of
 * the browser bundle.
 *
 * The flow mirrors `agentWallet()` in apps/mcp/src/pay.ts: this server builds and
 * freezes the transfer, apps/api signs it with the user's delegated Privy wallet
 * under its own caps, and the Blocky402 facilitator settles it as fee payer.
 *
 * A wallet that already holds the licence never reaches the payment path: the
 * bearer token identifies it and apps/api answers 200 straight away.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/unlock/[id]">) {
  const { id } = await ctx.params;

  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Connect a wallet before unlocking a prompt." },
      { status: 401 },
    );
  }

  const prompt = await fetchPrompt(id).catch(() => undefined);
  if (!prompt) return NextResponse.json({ error: `unknown prompt ${id}` }, { status: 404 });

  const authorization = `Bearer ${token}`;
  const meRes = await fetch(`${API_BASE}/agent/me`, { headers: { authorization } });
  if (!meRes.ok) {
    return NextResponse.json(
      { error: "Your wallet link expired. Connect again." },
      { status: 401 },
    );
  }
  const me = (await meRes.json()) as AgentIdentity;

  const held = await balances(me.account);

  const signer = externalHederaSigner(me.account, me.publicKey, async (bodyBytes) => {
    const res = await fetch(`${API_BASE}/agent/sign`, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ bodyBytes: Buffer.from(bodyBytes).toString("base64") }),
    });
    if (!res.ok) throw new Error(`the API refused to sign: ${await res.text()}`);
    const { signature } = (await res.json()) as { signature: string };
    return Buffer.from(signature, "hex");
  });

  const client = x402Client.fromConfig({
    schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }],
    ...spendPolicy(prompt, held),
  });

  try {
    const res = await wrapFetchWithPayment(fetch, client)(unlockUrl(id), {
      headers: { authorization, Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `unlock failed (${res.status})` }, { status: res.status });
    }
    const { body } = (await res.json()) as { id: string; body: string };
    return NextResponse.json({
      id,
      body,
      account: me.account,
      transaction: transactionIdOf(res.headers.get("payment-response")),
    });
  } catch (err) {
    // The spend filter, the signer and the facilitator all surface here; the
    // message is the only thing that tells the user which one refused.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "payment failed" },
      { status: 402 },
    );
  }
}
