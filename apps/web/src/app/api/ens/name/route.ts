import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

/**
 * Which name a wallet owns under the parent.
 *
 * Unauthenticated, because the answer is onchain and belongs to the wallet
 * rather than to a session. That matters more than it sounds: the name used to
 * be readable only through `/agent/me`, so a browser holding no agent token
 * showed the claim form to someone who already owned a name and offered to sell
 * them a second one. The agent token is per origin, so signing in on a
 * different host was enough to trigger it.
 */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "a wallet address is required" }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/ens/name?address=${encodeURIComponent(address)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return NextResponse.json({ error: "not implemented" }, { status: 501 });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
