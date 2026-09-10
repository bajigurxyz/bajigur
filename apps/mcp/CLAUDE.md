# CLAUDE.md — apps/mcp

`@bajigur/mcp`, the MCP server that lets Claude Desktop discover and pay for
prompts. Owned by Kiel. Design in
`../../docs/superpowers/specs/2026-09-10-bajigur-product-design.md`.

- Local stdio server: the payer's Hedera key must stay on the user's machine,
  so it is launched by Claude Desktop with `bun run src/index.ts`, never hosted.
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
- Environment: `BAJIGUR_API_URL`, `HEDERA_NETWORK`, `HEDERA_OPERATOR_ID`,
  `HEDERA_OPERATOR_KEY`, `X402_MAX_SPEND_USD` (cap per payment, default 1),
  `X402_PAY_WITH` (`usdc` default, or `hbar` to prefer the HBAR option).
- `bun run buy <prompt-id>` from the repo root buys a prompt from the terminal
  through the same tools; use it for demos and smoke tests.
- Privy: `src/externalSigner.ts` builds the x402 transfer and signs it with
  `tx.signWith(publicKey, rawSign)`, where `rawSign(bodyBytes)` returns the
  64-byte r||s over keccak256(bodyBytes). `privyRawSign` implements it with
  Privy's `POST /v1/wallets/{id}/raw_sign` (`bytes` + `hash_function:
  keccak256`, `v` byte dropped). `bun run privy:spike [prompt-id]` pays with
  the local key when `PRIVY_*` is unset, and with the Privy wallet when
  `PRIVY_APP_SECRET`, `PRIVY_WALLET_ID`, `PRIVY_WALLET_ADDRESS` and
  `NEXT_PUBLIC_PRIVY_APP_ID` are set. The Privy wallet's Hedera account is
  resolved from its EVM address on the mirror node, so it must have received
  HBAR once (auto-create) before paying.

## Layout

```
src/
  index.ts    stdio entry
  pay.ts      x402 client -> fetch with payment
  server.ts   createServer(): MCP tools
  externalSigner.ts  x402 Hedera signer over a rawSign callback (Privy, KMS)
scripts/
  buy.ts      terminal purchase via the MCP tools
  privy-spike.ts  pays through externalHederaSigner (local key or Privy raw_sign)
test/
```
