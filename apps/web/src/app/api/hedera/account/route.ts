import { NextResponse } from "next/server";

const NETWORK = process.env.HEDERA_NETWORK ?? "testnet";
const MIRROR = `https://${NETWORK}.mirrornode.hedera.com/api/v1`;
const USDC = process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274";

const toHbar = (tinybars: number) => (tinybars / 1e8).toFixed(4).replace(/\.?0+$/, "");
const toUsdc = (atomic: number) => (atomic / 1e6).toFixed(2);

type MirrorAccount = {
  account?: string;
  evm_address?: string;
  balance?: { balance?: number; tokens?: { token_id: string; balance: number }[] };
  _status?: unknown;
};

/**
 * The Hedera account behind a wallet address, straight from the mirror node.
 *
 * A Hedera account and an EVM address are the same thing under two names, but
 * the account only comes into existence once something is sent to the address.
 * Until then there is genuinely no account number to show.
 *
 * Unauthenticated on purpose: it reads public chain state for an address the
 * caller already has, and it answers before the wallet is linked, so the
 * profile can show the account the moment it exists rather than only after
 * Bajigur has been granted signing access.
 */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "a wallet address is required" }, { status: 400 });
  }

  const res = await fetch(`${MIRROR}/accounts/${address}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ exists: false, network: NETWORK });

  const mirror = (await res.json()) as MirrorAccount;
  // The mirror node answers 200 with a _status body for an unknown address.
  if (!mirror.account) return NextResponse.json({ exists: false, network: NETWORK });

  const usdc = mirror.balance?.tokens?.find((t) => t.token_id === USDC);
  return NextResponse.json({
    exists: true,
    network: NETWORK,
    account: mirror.account,
    address: mirror.evm_address ?? address,
    hbar: toHbar(mirror.balance?.balance ?? 0),
    usdc: usdc ? toUsdc(usdc.balance) : "0.00",
  });
}
