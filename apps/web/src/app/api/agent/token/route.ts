import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE } from "@/lib/agent";

/**
 * Hands the agent token back to the signed-in user.
 *
 * Deliberately a separate route from /api/agent/me: everything else treats the
 * token as a secret the browser must not hold, and this is the one surface
 * that exists to reveal it — the user has to paste it into their own Claude
 * Desktop config. Keeping it apart makes that exception explicit rather than a
 * field that quietly rides along with every identity read.
 */
export async function GET() {
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "not linked" }, { status: 401 });
  return NextResponse.json({ token });
}
