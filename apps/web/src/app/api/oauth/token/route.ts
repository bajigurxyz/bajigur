import { NextResponse } from "next/server";
import { redeemCode } from "@/lib/oauth";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

/**
 * Exchanges an authorization code for the agent token.
 *
 * The access token returned is the Bajigur agent token itself, so the MCP
 * server and apps/api need no new notion of identity. It does not expire on a
 * timer, so no refresh token is issued; revoking the wallet delegation in
 * Privy is what ends it.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const field = (name: string) => (form?.get(name) ?? "").toString();

  if (field("grant_type") !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400, headers: CORS });
  }

  const result = redeemCode(
    field("code"),
    field("client_id"),
    field("redirect_uri"),
    field("code_verifier"),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400, headers: CORS });
  }

  return NextResponse.json(
    { access_token: result.token, token_type: "Bearer", scope: "bajigur:buy" },
    { headers: { ...CORS, "cache-control": "no-store" } },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
