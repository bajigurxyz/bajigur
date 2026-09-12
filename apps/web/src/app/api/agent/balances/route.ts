import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE, type AgentIdentity } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

const NETWORK = process.env.HEDERA_NETWORK ?? "testnet";
const MIRROR = `https://${NETWORK}.mirrornode.hedera.com/api/v1`;
const USDC = process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274";

/** Tinybars to HBAR. Hedera stores 8 decimal places. */
const toHbar = (tinybars: number) => (tinybars / 1e8).toFixed(4).replace(/\.?0+$/, "");
/** Atomic USDC to a decimal string. HTS USDC has 6 decimals. */
const toUsdc = (atomic: number) => (atomic / 1e6).toFixed(2);

type MirrorAccount = {
  evm_address?: string;
  balance?: { balance?: number; tokens?: { token_id: string; balance: number }[] };
};

/**
 * What the signed-in wallet holds on Hedera.
 *
 * Read from the mirror node rather than from anything Bajigur stores, so the
 * numbers are the chain's answer and not our bookkeeping. Server side because
 * the agent token identifying the account is httpOnly.
 */
export async function GET() {
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "not linked" }, { status: 401 });

  const meRes = await fetch(`${API_BASE}/agent/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) return NextResponse.json({ error: "agent token rejected" }, { status: 401 });
  const me = (await meRes.json()) as AgentIdentity;

  const res = await fetch(`${MIRROR}/accounts/${me.account}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    // A fresh account can be missing from the mirror node for a few seconds.
    // Report the identity we do know rather than failing the whole page.
    return NextResponse.json({ account: me.account, cap: me.cap, hbar: null, usdc: null });
  }
  const mirror = (await res.json()) as MirrorAccount;
  const usdc = mirror.balance?.tokens?.find((t) => t.token_id === USDC);

  return NextResponse.json({
    account: me.account,
    address: mirror.evm_address ?? null,
    cap: me.cap,
    network: NETWORK,
    hbar: toHbar(mirror.balance?.balance ?? 0),
    usdc: usdc ? toUsdc(usdc.balance) : "0.00",
    usdcTokenId: USDC,
  });
}
