import { NextResponse } from "next/server";
import { registerClient } from "@/lib/oauth";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

/**
 * Dynamic client registration, RFC 7591.
 *
 * MCP clients register themselves rather than asking a human to create an app
 * first, which is the whole reason connecting can be one click. Registration
 * is open: it hands out an identifier, not access. Access still needs the user
 * to approve in a browser, and PKCE binds the code to the client that started
 * the flow.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    redirect_uris?: string[];
    client_name?: string;
  };
  const redirectUris = body.redirect_uris ?? [];
  if (redirectUris.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris is required" },
      { status: 400, headers: CORS },
    );
  }
  const client = registerClient(redirectUris, body.client_name);
  return NextResponse.json(
    {
      client_id: client.clientId,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
