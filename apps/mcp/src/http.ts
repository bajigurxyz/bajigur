import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { agentWallet } from "./pay";
import { createServer } from "./server";

/**
 * Remote MCP endpoint: the same tools as the stdio server, reachable by URL.
 *
 * Why it exists: the stdio server asks a user to clone the repo, install bun,
 * and edit a JSON file with an absolute path. That loses most people before
 * their first purchase. Here they paste one URL.
 *
 * How one endpoint serves everyone: it is STATELESS. Each request builds its
 * own server and transport, and the wallet comes from that request's
 * `Authorization: Bearer <agent token>` header — the token the web app hands
 * out after a user delegates their Privy wallet. So the endpoint never holds
 * anyone's credential, and two users hitting it pay from their own accounts.
 *
 * Without a token the catalogue still works and only buying is refused, so a
 * visitor can connect and look around before committing to anything.
 */

const API = process.env.BAJIGUR_API_URL ?? "https://api-production-fe21.up.railway.app";
const PORT = Number(process.env.MCP_PORT ?? process.env.PORT ?? 3004);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers":
    "content-type, authorization, mcp-session-id, mcp-protocol-version",
  "access-control-expose-headers": "mcp-session-id",
};

const bearer = (request: Request) =>
  request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

/** A paid fetch for this request's wallet, or undefined when no usable token came with it. */
async function walletFor(request: Request) {
  const token = bearer(request);
  if (!token) return undefined;
  try {
    return await agentWallet(API, token);
  } catch {
    // A bad token must not take down the catalogue: fall through to read-only
    // and let get_prompt explain itself.
    return undefined;
  }
}

const NO_WALLET = async () => {
  throw new Error(
    "No wallet is connected. Sign in at the Bajigur web app, delegate your wallet, and send the agent token as an Authorization: Bearer header.",
  );
};

async function handleMcp(request: Request) {
  const connected = await walletFor(request);
  const server = createServer(API, connected?.paid ?? NO_WALLET, fetch, connected?.account);
  // Stateless: no session id, JSON responses, and everything is torn down with
  // the request. Nothing about one caller can leak into another's.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
    return new Response(response.body, { status: response.status, headers });
  } finally {
    await transport.close();
    await server.close();
  }
}

export async function handle(request: Request) {
  const { pathname } = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (pathname === "/mcp") return handleMcp(request);

  if (pathname === "/health") {
    return Response.json({ ok: true, service: "bajigur-mcp", api: API }, { headers: CORS });
  }

  // Everything else is the install guide, so a human who opens the URL in a
  // browser gets instructions instead of a 404.
  const { install } = await import("./install");
  return new Response(install(new URL(request.url).origin), {
    headers: { "content-type": "text/plain; charset=utf-8", ...CORS },
  });
}

export default { fetch: handle, port: PORT };
