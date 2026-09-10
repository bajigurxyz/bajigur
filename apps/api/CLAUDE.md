# CLAUDE.md — apps/api

`@bajigur/api`, the HTTP API and x402 payment gateway. Owned by Kiel.

- Bun runtime with Hono. Entry point is `src/index.ts`, which exports a Bun
  server object; the routes live in `src/app.ts` so tests can call
  `app.request(...)` without binding a port.
- Dev server runs on port 3002 (`PORT`): `bun run dev --filter=@bajigur/api`.
- Tests use `bun:test` and go in `test/`. Prefer `app.request()` over real HTTP.
- This is the only workspace that may hold secrets. Add every new variable to
  the root `.env.example` with an empty value.
- Planned responsibilities, none of them implemented yet:
  - x402-gated routes settled through the Blocky402 facilitator on Hedera.
  - Server-side Privy calls for wallet and funding flows.
  - The upstream API that the Bazantic gateway and Recipes are built on.

## Layout

```
src/
  app.ts      Hono app and route definitions
  index.ts    Bun server entry (port binding only)
test/
```
