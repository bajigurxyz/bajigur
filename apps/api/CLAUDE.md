# CLAUDE.md — apps/api

`@bajigur/api`, the HTTP API and x402 payment gateway. Owned by Kiel.

- Bun runtime with Hono. Entry point is `src/index.ts`, which exports a Bun
  server object; the routes live in `src/app.ts` so tests can call
  `app.request(...)` without binding a port.
- Dev server runs on port 3002 (`PORT`): `bun run dev --filter=@bajigur/api`.
- Tests use `bun:test` and go in `test/`. Prefer `app.request()` over real HTTP.
- This is the only workspace that may hold secrets. Add every new variable to
  the root `.env.example` with an empty value.
- x402 v2 lives in `src/x402.ts`: `@x402/hono` middleware over
  `@x402/core` + `@x402/hedera`, settled by the Blocky402 facilitator. Only
  `GET /prompts/:id/unlock` is paid; `payTo` and price are resolved per request
  from the prompt, so each creator is paid directly.
- `createApp(facilitator?)` takes a `FacilitatorClient` so tests can stub
  `getSupported` / `verify` / `settle` without network. Never construct the app
  at import time.
- Environment: `HEDERA_NETWORK` (`testnet`), `X402_FACILITATOR_URL`
  (defaults to `https://api.testnet.blocky402.com`), `X402_PAY_TO_ADDRESS`
  (platform Hedera account used as fallback `payTo`).
- Still to come: HCS audit trail on `onAfterSettle`, licence check on
  `onProtectedRequest`, discovery endpoint, HBAR in `accepts`, Privy calls.

## Layout

```
src/
  app.ts      Hono app and routes; createApp(facilitator?)
  prompts.ts  in-memory catalogue
  x402.ts     x402 middleware
  index.ts    Bun server entry (port binding only)
test/
```
