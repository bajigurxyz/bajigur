import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

/**
 * Lets the account hold USDC.
 *
 * Setting up payments already does this, so it only matters when the account
 * was created some other way, or the association failed part way through.
 * apps/api makes it idempotent, so pressing it twice is harmless.
 */
export async function POST() {
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "not linked" }, { status: 401 });

  const res = await fetch(`${API_BASE}/agent/associate`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  return NextResponse.json(payload, { status: res.status });
}
