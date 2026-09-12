import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A minimal OAuth 2.1 authorization server, just enough for MCP clients.
 *
 * MCP clients (Claude Desktop, Claude Code, Cursor) discover an authorization
 * server, register themselves dynamically, send the user through a browser to
 * approve, and exchange the resulting code for a token. That replaces asking
 * someone to copy a bearer token into a config file by hand.
 *
 * The access token handed back IS the Bajigur agent token, so everything
 * downstream, the MCP server and apps/api, keeps working unchanged.
 *
 * State lives in memory. Codes are single use and expire in a minute, so the
 * only cost of losing them on restart is that an authorization in flight has
 * to be retried. Registered clients are cheap to recreate the same way. Move
 * both to a store before running more than one instance.
 */

export interface OAuthClient {
  clientId: string;
  redirectUris: string[];
  name?: string;
}

interface PendingCode {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  token: string;
  expiresAt: number;
}

const clients = new Map<string, OAuthClient>();
const codes = new Map<string, PendingCode>();

const CODE_TTL_MS = 60_000;

const base64url = (buffer: Buffer) => buffer.toString("base64url");

export function registerClient(redirectUris: string[], name?: string): OAuthClient {
  const client: OAuthClient = { clientId: base64url(randomBytes(16)), redirectUris, name };
  clients.set(client.clientId, client);
  return client;
}

export const getClient = (clientId: string) => clients.get(clientId);

/**
 * Whether a redirect target is one the client registered.
 *
 * Exact match only. Prefix matching is how open redirects get built, and an
 * open redirect here would hand someone else's agent token to an attacker.
 */
export function isRegisteredRedirect(client: OAuthClient, redirectUri: string) {
  return client.redirectUris.includes(redirectUri);
}

export function issueCode(input: Omit<PendingCode, "expiresAt">) {
  const code = base64url(randomBytes(32));
  codes.set(code, { ...input, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

export type RedeemResult = { ok: true; token: string } | { ok: false; error: string };

/** Redeems a code exactly once, checking PKCE, the client, and the redirect. */
export function redeemCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
): RedeemResult {
  const pending = codes.get(code);
  // Single use: gone whether or not the rest of the checks pass, so a leaked
  // code cannot be replayed while someone works out the verifier.
  codes.delete(code);

  if (!pending) return { ok: false, error: "invalid_grant" };
  if (Date.now() > pending.expiresAt) return { ok: false, error: "invalid_grant" };
  if (pending.clientId !== clientId) return { ok: false, error: "invalid_client" };
  if (pending.redirectUri !== redirectUri) return { ok: false, error: "invalid_grant" };

  const expected = Buffer.from(pending.codeChallenge);
  const actual = Buffer.from(base64url(createHash("sha256").update(codeVerifier).digest()));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, error: "invalid_grant" };
  }
  return { ok: true, token: pending.token };
}

/** Authorization server metadata, per RFC 8414. */
export const authorizationServerMetadata = (origin: string) => ({
  issuer: origin,
  authorization_endpoint: `${origin}/oauth/authorize`,
  token_endpoint: `${origin}/api/oauth/token`,
  registration_endpoint: `${origin}/api/oauth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none"],
  scopes_supported: ["bajigur:buy"],
});
