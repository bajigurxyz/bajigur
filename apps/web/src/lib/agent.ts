/**
 * Agent tokens: the bridge between a signed-in Privy user and payments on
 * Hedera.
 *
 * apps/api mints a short HS256 token for a wallet the user has delegated to
 * Bajigur, and will sign Hedera transfers with it under per-token caps. The
 * token is a bearer credential for someone else's money, so it never reaches
 * client JavaScript: the route handlers in app/api/agent keep it in an
 * httpOnly cookie and the browser only ever sees what it bought.
 *
 * The one exception is the Claude Desktop config, where the user has to paste
 * the token themselves — that surface asks for it explicitly.
 */

export const AGENT_COOKIE = "bajigur_agent";

/** What apps/api answers from POST /agent/link and GET /agent/me. */
export interface AgentIdentity {
  /** Hedera account id (0.0.x) created for the delegated wallet. */
  account: string;
  /** The wallet's EVM address. */
  address?: string;
  /** Compressed secp256k1 public key, raw hex. */
  publicKey: string;
  /** Per-payment USD cap the API will sign up to. */
  cap: string;
  walletId?: string;
}

export interface LinkedAgent extends AgentIdentity {
  token: string;
}
