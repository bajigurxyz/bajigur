import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * The OAuth 2.1 authorization server an MCP client talks to.
 *
 * Nothing is stored. A registered client and a pending authorization code are
 * both sealed strings that carry their own contents, so any instance can serve
 * a request started by any other.
 *
 * That is not a preference, it is a correctness requirement. This file used to
 * keep two Maps in memory, which worked in `next dev` and failed in production:
 * registration and the consent POST land on different serverless instances, so
 * a client registered seconds earlier came back `invalid_client` and no MCP
 * client could ever finish signing in.
 */

/**
 * Sealing key. A per-process random key when `OAUTH_SECRET` is unset, so
 * `next dev` needs no setup; that fallback is only sound because dev is one
 * process. Set the variable in every deployed environment, and keep it stable:
 * rotating it invalidates registered clients and any code in flight.
 */
const SECRET = process.env.OAUTH_SECRET
  ? createHash("sha256").update(process.env.OAUTH_SECRET).digest()
  : randomBytes(32);

const CODE_TTL_MS = 60_000;

const base64url = (buffer: Buffer) => buffer.toString("base64url");

/** Authenticated encryption, so the contents are neither readable nor forgeable. */
function seal(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", SECRET, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return `${base64url(iv)}.${base64url(body)}.${base64url(cipher.getAuthTag())}`;
}

/** The payload back, or undefined for anything tampered with, truncated or foreign. */
function unseal<T>(sealed: string): T | undefined {
  const [iv, body, tag] = sealed.split(".");
  if (!iv || !body || !tag) return undefined;
  try {
    const decipher = createDecipheriv("aes-256-gcm", SECRET, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const json = Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]);
    return JSON.parse(json.toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

export interface OAuthClient {
  clientId: string;
  redirectUris: string[];
  name?: string;
}

interface CodePayload {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  token: string;
  expiresAt: number;
}

/**
 * RFC 7591 dynamic registration.
 *
 * The client id *is* the registration: nothing here is secret, and a client
 * that cannot present a well-formed sealed id was never registered by us.
 */
export function registerClient(redirectUris: string[], name?: string): OAuthClient {
  return { clientId: seal({ redirectUris, name }), redirectUris, name };
}

export const getClient = (clientId: string): OAuthClient | undefined => {
  const payload = unseal<{ redirectUris: string[]; name?: string }>(clientId);
  if (!payload || !Array.isArray(payload.redirectUris)) return undefined;
  return { clientId, redirectUris: payload.redirectUris, name: payload.name };
};

/**
 * Whether a redirect target is one the client registered.
 *
 * Exact match only. Prefix matching is how open redirects get built, and an
 * open redirect here would hand someone else's agent token to an attacker.
 */
export function isRegisteredRedirect(client: OAuthClient, redirectUri: string) {
  return client.redirectUris.includes(redirectUri);
}

export function issueCode(input: Omit<CodePayload, "expiresAt">) {
  return seal({ ...input, expiresAt: Date.now() + CODE_TTL_MS } satisfies CodePayload);
}

export type RedeemResult = { ok: true; token: string } | { ok: false; error: string };

/**
 * Redeems a code, checking PKCE, the client, the redirect and the clock.
 *
 * What protects a leaked code is the PKCE verifier, which never leaves the
 * client that generated it. Whoever intercepts the code cannot exchange it.
 *
 * Strict single use is the one thing given up by holding no state: a code the
 * legitimate client already spent still works until it expires a minute later,
 * where the old in-memory version deleted it on first use. Restoring it needs
 * somewhere shared to remember spent codes, which is worth doing before this
 * ever points at real money.
 */
export function redeemCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
): RedeemResult {
  const pending = unseal<CodePayload>(code);

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
