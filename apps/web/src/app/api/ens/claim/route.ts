import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

/**
 * Claims a name under the parent for the signed-in wallet.
 *
 * apps/api does the Sepolia transaction, so the user never switches chain and
 * never needs Sepolia ETH. The agent token is what says which wallet the name
 * and its bajigur.hedera record belong to.
 */
export async function POST(request: Request) {
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Set up payments before claiming a name." }, { status: 401 });
  }
  const { label } = (await request.json().catch(() => ({}))) as { label?: string };
  if (!label) return NextResponse.json({ error: "a label is required" }, { status: 400 });

  const res = await fetch(`${API_BASE}/ens/claim`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (res.status === 404) {
    return NextResponse.json({ error: "not implemented" }, { status: 501 });
  }
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
