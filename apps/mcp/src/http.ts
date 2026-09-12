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
 * visitor can connect and look around before committing to anything. Refusing
 * to buy is a 401 carrying the OAuth challenge, which is what makes the client
 * offer to log in rather than report a failure.
 */

const API = process.env.BAJIGUR_API_URL ?? "https://api-production-fe21.up.railway.app";
/** The web app, which is also this resource server's OAuth authorization server. */
const APP = (process.env.BAJIGUR_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
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

/**
 * RFC 9728 metadata, which is how an MCP client discovers where to log in.
 *
 * The client hits /mcp, gets a 401 naming this document, reads it, finds the
 * authorization server, registers itself and opens a browser. That chain is
 * what turns "paste this token into a config file" into one click.
 */
const protectedResourceMetadata = (origin: string) => ({
  resource: `${origin}/mcp`,
  authorization_servers: [APP],
  bearer_methods_supported: ["header"],
  scopes_supported: ["bajigur:buy"],
  resource_documentation: origin,
});

/** Tells the client which document explains how to authenticate here. */
const challenge = (origin: string, error: string) => ({
  "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", error="${error}"`,
});

/** Tools that spend the caller's money. Everything else is free to call. */
const PAID_TOOLS = new Set(["get_prompt"]);

/**
 * Would this request spend money? Only a call to a paid tool does. `initialize`,
 * `tools/list` and the read-only tools are how a visitor looks around, and they
 * stay open so connecting does not demand a login first.
 *
 * The body is read from a clone, so the transport still gets to read it.
 */
async function spends(request: Request) {
  if (request.method !== "POST") return false;
  try {
    const body = await request.clone().json();
    const messages = Array.isArray(body) ? body : [body];
    return messages.some(
      (message) => message?.method === "tools/call" && PAID_TOOLS.has(message?.params?.name),
    );
  } catch {
    // Unparseable body: let the transport produce the protocol error.
    return false;
  }
}

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
  const origin = new URL(request.url).origin;
  const token = bearer(request);
  const connected = await walletFor(request);

  // 401 is the only thing that starts OAuth. An MCP client reads the metadata
  // named in WWW-Authenticate, registers itself, opens a browser, and retries
  // with a token. Answer 200 with an error message instead and no client ever
  // offers to log in: the user just sees the purchase refused.
  //
  // A token that does not work earns the challenge on any call, because that
  // client should authorize again. A missing token earns it only when the call
  // would spend money, so browsing the catalogue still needs no account.
  if (token && !connected) {
    return Response.json(
      { error: "invalid_token" },
      { status: 401, headers: { ...CORS, ...challenge(origin, "invalid_token") } },
    );
  }
  if (!connected && (await spends(request))) {
    return Response.json(
      { error: "unauthorized", error_description: "Buying a prompt needs a connected wallet." },
      { status: 401, headers: { ...CORS, ...challenge(origin, "unauthorized") } },
    );
  }
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

// Behind Railway's proxy the request URL is http://; the metadata echoes it, so restore the public scheme.
function withForwardedProto(request: Request) {
  const proto = request.headers.get("x-forwarded-proto");
  if (!proto || request.url.startsWith(`${proto}:`)) return request;
  return new Request(request.url.replace(/^https?:/, `${proto}:`), request);
}

export async function handle(incoming: Request) {
  const request = withForwardedProto(incoming);
  const { pathname } = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (pathname === "/mcp") return handleMcp(request);

  if (
    pathname === "/.well-known/oauth-protected-resource" ||
    pathname.startsWith("/.well-known/oauth-protected-resource/")
  ) {
    return Response.json(protectedResourceMetadata(new URL(request.url).origin), {
      headers: CORS,
    });
  }

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
