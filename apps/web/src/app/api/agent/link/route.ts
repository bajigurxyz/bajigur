import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE, type LinkedAgent } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

/**
 * Exchanges a Privy access token for a Bajigur agent token.
 *
 * apps/api verifies the Privy token, finds the wallet the user delegated,
 * creates its Hedera account, associates USDC, and answers with a token that
 * authorises capped signing. That token is stored httpOnly here — the browser
 * gets the account details, never the credential.
 */
export async function POST(request: Request) {
  const { privyAccessToken } = (await request.json().catch(() => ({}))) as {
    privyAccessToken?: string;
  };
  if (!privyAccessToken) {
    return NextResponse.json({ error: "privyAccessToken is required" }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/agent/link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ privyAccessToken }),
  });
  const payload = (await res.json().catch(() => ({}))) as Partial<LinkedAgent> & { error?: string };
  if (!res.ok || !payload.token) {
    return NextResponse.json(
      { error: payload.error ?? `agent link failed (${res.status})` },
      { status: res.status === 200 ? 502 : res.status },
    );
  }

  const { token, ...identity } = payload as LinkedAgent;
  (await cookies()).set(AGENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json(identity);
}
