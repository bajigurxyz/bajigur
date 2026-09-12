import { NextResponse } from "next/server";
import { authorizationServerMetadata } from "@/lib/oauth";

const CORS = { "access-control-allow-origin": "*" };

/** RFC 8414 metadata, rewritten from /.well-known/oauth-authorization-server. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json(authorizationServerMetadata(origin), { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
