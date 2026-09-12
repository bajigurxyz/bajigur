# CLAUDE.md — apps/mcp

`@bajigur/mcp`, the MCP server that lets Claude Desktop discover and pay for
prompts. Owned by Kiel. Design in
`../../docs/superpowers/specs/2026-09-10-bajigur-product-design.md`.

- Two transports. `src/index.ts` is the local stdio server (a raw Hedera key
  stays on the user's machine, or an agent token). `src/http.ts` is the hosted
  Streamable HTTP server: stateless, one endpoint for everyone, the wallet
  comes from the request's `Authorization: Bearer <agent token>`; without a
  token it is read-only. Live at `https://mcp.bajigur.xyz/mcp`
  (Railway service `mcp`, `apps/mcp/Dockerfile`, deploy with
  `railway up --service mcp --detach`). It publishes RFC 9728 metadata at
  `/.well-known/oauth-protected-resource` pointing at `BAJIGUR_APP_URL` (the
  web app is the OAuth authorization server), and serves the install guide
  (`src/install.ts`) on every other path.
- It is a transport wrapper over `apps/api`. No catalogue or payment logic
  lives here; `src/pay.ts` only wraps `fetch` with the x402 Hedera client and a
  per-payment spend cap.
- `createServer(api, paidFetch, plainFetch?)` in `src/server.ts` takes both
  fetches so tests run in-memory with no network.
- Tools: `search_prompts` (free), `get_prompt` (free if the wallet holds a
  licence, otherwise pays via x402 and returns body + Hedera transaction id),
  `my_licenses` (what the wallet holds onchain).
- Every request carries signed identity headers (`identityHeaders` in
  `src/pay.ts`) so the API can recognise licence holders before the 402.
- Agent-token mode: with `BAJIGUR_AGENT_TOKEN` set, `agentWallet()` in
  `src/pay.ts` fetches `/agent/me`, builds the x402 transfer locally and sends
  its body to `/agent/sign`, where the API signs with the user's delegated
  Privy wallet. No Hedera key on this machine; `HEDERA_OPERATOR_*` unused.
- Environment: `BAJIGUR_API_URL`, `HEDERA_NETWORK`, `HEDERA_OPERATOR_ID`,
  `HEDERA_OPERATOR_KEY`, `X402_MAX_SPEND_USD` (cap per payment, default 1),
  `X402_PAY_WITH` (`usdc` default, or `hbar` to pay in HBAR; it governs both
  wallets through `spendPolicy()`, and it has to set `allowedAssets` as well as
  the selector, because x402's default spend controls allow stablecoins only
  and would otherwise drop the HBAR option before the selector runs),
  `ENS_AGENT_NAME` (optional, e.g. `agent.bajigur.eth`; used for `my_licenses`).
- `bun run buy <prompt-id>` from the repo root buys a prompt from the terminal
  through the same tools; use it for demos and smoke tests.
- Privy: `src/externalSigner.ts` builds the x402 transfer and signs it with
  `tx.signWith(publicKey, rawSign)`, where `rawSign(bodyBytes)` returns the
  64-byte r||s over keccak256(bodyBytes). For Privy ethereum wallets use the
  `secp256k1_sign` RPC (`POST /v1/wallets/{id}/rpc`, `params.hash`); the
  `/raw_sign` endpoint rejects ethereum wallets, and the wallet object carries
  no `public_key`, so `privyWallet` recovers it from a signature over a fixed
  hash and checks it against the wallet address. The wallet's Hedera account
  is auto-created (hollow) by sending it HBAR; `bun run privy:associate`
  associates USDC with a Privy-signed transaction, which also completes the
  account key. `bun run privy:spike [prompt-id]` then pays through Privy
  (falls back to the local key when `PRIVY_*` is unset).

## Layout

```
src/
  index.ts    stdio entry
  http.ts     hosted Streamable HTTP entry (stateless, bearer agent token)
  install.ts  plain-text install guide served by http.ts
  pay.ts      x402 client -> fetch with payment
  server.ts   createServer(): MCP tools
  externalSigner.ts  x402 Hedera signer over a rawSign callback (Privy, KMS)
scripts/
  buy.ts      terminal purchase via the MCP tools
  privy-associate.ts  Privy-signed USDC association (completes the hollow account)
  privy-spike.ts  pays through externalHederaSigner (local key or Privy)
test/
```
