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
- Tools: `search_prompts` (free, read-only) and `get_prompt` (pays via x402,
  returns body + Hedera transaction id). `my_licenses` comes with the
  `PromptRegistry` contract.
- Environment: `BAJIGUR_API_URL`, `HEDERA_NETWORK`, `HEDERA_OPERATOR_ID`,
  `HEDERA_OPERATOR_KEY`, `X402_MAX_SPEND_USD` (cap per payment, default 1).

## Layout

```
src/
  index.ts    stdio entry
  pay.ts      x402 client -> fetch with payment
  server.ts   createServer(): MCP tools
test/
```
