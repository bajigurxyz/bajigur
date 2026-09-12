import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE, type AgentIdentity } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

/** Who the stored agent token belongs to, or 401 when there is no usable one. */
export async function GET() {
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "not linked" }, { status: 401 });

  const res = await fetch(`${API_BASE}/agent/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // The token is gone or no longer valid; clear it so the UI offers linking
    // again instead of looping on a credential that can never work.
    (await cookies()).delete(AGENT_COOKIE);
    return NextResponse.json({ error: "agent token rejected" }, { status: 401 });
  }
  return NextResponse.json((await res.json()) as AgentIdentity);
}
