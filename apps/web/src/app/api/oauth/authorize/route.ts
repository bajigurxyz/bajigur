import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE, type LinkedAgent } from "@/lib/agent";
import { API_BASE } from "@/lib/api";
import { getClient, isRegisteredRedirect, issueCode } from "@/lib/oauth";

/**
 * Turns an approved sign-in into an authorization code.
 *
 * Called by the consent page once the user has signed in with Privy and
 * delegated their wallet. It links the wallet through apps/api to get the
 * agent token, stashes it against a one-minute single-use code, and hands back
 * the redirect for the browser to follow.
 *
 * The token never travels through the redirect itself: the client has to come
 * back to /api/oauth/token with the PKCE verifier for it.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    privyAccessToken?: string;
    clientId?: string;
    redirectUri?: string;
    codeChallenge?: string;
    state?: string;
  };
  const { privyAccessToken, clientId, redirectUri, codeChallenge, state } = body;

  if (!clientId || !redirectUri || !codeChallenge) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const client = getClient(clientId);
  if (!client) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  if (!isRegisteredRedirect(client, redirectUri)) {
    // Never redirect somewhere the client did not register: that is how an
    // open redirect turns into someone else's token.
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }
  if (!privyAccessToken) return NextResponse.json({ error: "access_denied" }, { status: 401 });

  const linkRes = await fetch(`${API_BASE}/agent/link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ privyAccessToken }),
  });
  const payload = (await linkRes.json().catch(() => ({}))) as Partial<LinkedAgent> & {
    error?: string;
  };
  if (!linkRes.ok || !payload.token) {
    return NextResponse.json(
      { error: "server_error", error_description: payload.error ?? "could not link the wallet" },
      { status: 502 },
    );
  }

  // Same wallet, same session: signing in here also signs in the web app, so
  // the browser and the agent are never looking at different accounts.
  (await cookies()).set(AGENT_COOKIE, payload.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const code = issueCode({ clientId, redirectUri, codeChallenge, token: payload.token });
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);

  return NextResponse.json({ redirect: redirect.toString(), account: payload.account });
}
