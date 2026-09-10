# CLAUDE.md — apps/mcp

`@bajigur/mcp`, the MCP server that lets Claude Desktop discover and pay for
prompts. Owned by Kiel. Built after `apps/api`; see the product design in
`../../docs/superpowers/specs/2026-09-10-bajigur-product-design.md`.

- An MCP server is a transport wrapper, not a place for business logic: it
  calls `apps/api` and never reimplements payment or catalogue behaviour.
- It holds the x402 client (`@x402/hedera`) that signs the payment when the API
  answers `402`. The signing key comes from the environment; never hardcode it.
- Tools: `search_prompts`, `get_prompt` (pays if needed), `my_licenses`.

See `README.md` for the intended purpose.
