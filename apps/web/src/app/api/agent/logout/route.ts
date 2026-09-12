import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE } from "@/lib/agent";

/** Forgets the agent token on this device. The delegation itself is revoked in Privy. */
export async function POST() {
  (await cookies()).delete(AGENT_COOKIE);
  return NextResponse.json({ ok: true });
}
