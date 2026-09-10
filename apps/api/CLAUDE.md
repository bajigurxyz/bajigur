# CLAUDE.md — apps/api

`@bajigur/api`, the HTTP API and x402 payment gateway. Owned by Kiel.

- Bun runtime with Hono. Entry point is `src/index.ts`, which exports a Bun
  server object; the routes live in `src/app.ts` so tests can call
  `app.request(...)` without binding a port.
- Dev server runs on port 3002 (`PORT`): `bun run dev --filter=@bajigur/api`.
- Production runs on Railway (project `bajigur`, service `api`) from
  `apps/api/Dockerfile` with the repo as build context; public URL
  `https://api-production-fe21.up.railway.app`. Deploy with
  `railway up --service api --detach` from the repo root; variables live in
  Railway (same names as `.env`), plus `RAILWAY_DOCKERFILE_PATH`.
  `src/index.ts` rewrites the request scheme from `x-forwarded-proto` so 402
  and discovery URLs are `https`.
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
  (platform Hedera account used as fallback `payTo`), `X402_PAY_TO_KEY` (its
  private key, only needed by `bun run hedera:associate`).
- `bun run hedera:associate` (from the repo root, so `.env` loads) associates
  the payer and payTo accounts with testnet USDC `0.0.429274`.
- HCS audit trail: `src/hcs.ts` publishes one JSON message per successful
  settlement to `HCS_TOPIC_ID` (create it once with `bun run hedera:topic`),
  signed by the platform account (`X402_PAY_TO_ADDRESS` / `X402_PAY_TO_KEY`).
  Wired through `createApp(facilitator?, onSettled?)` and the resource
  server's `onAfterSettle`; fire-and-forget so the paid response never waits.
  `@hiero-ledger/sdk` is pinned to the exact version `@x402/hedera` uses.
- Discovery: the paid route declares the x402 bazaar extension
  (`@x402/extensions/bazaar`) so facilitators can index it, and
  `GET /discovery/resources` serves the same catalogue in the bazaar
  `DiscoveryResourcesResponse` shape for agents and Bazantic. Prices come from
  `requirementsFor(prompt)`, which reuses the Hedera scheme's `parsePrice`.
- Every prompt is priced twice: `priceUsd` (settled in USDC via the scheme's
  default asset) and a fixed `priceHbar` set by the creator (asset `0.0.0`,
  converted with `tinybars()`); both appear in `accepts` and the client picks.
- Licences: `src/registry.ts` talks to `PromptRegistry` (`PROMPT_REGISTRY_ADDRESS`)
  with the platform key. `onAfterSettle` calls `issue(registryId, payer, txId)`
  (payer's EVM address resolved from the mirror node); `onProtectedRequest`
  grants access without payment when the caller proves a wallet that holds the
  licence (`balanceOf` via the mirror node's free `contracts/call`).
  `GET /licenses/:account` lists what an account holds.
- Wallet proof is three headers signed with the Hedera ECDSA key:
  `x-hedera-account`, `x-hedera-timestamp` (ms, 5 min window),
  `x-hedera-signature` (hex of `sign("bajigur:<account>:<timestamp>")`),
  verified against the account key from the mirror node. Swap for the x402
  SIWx extension once it supports Hedera.
- Seed prompts carry `registryId`; `bun run hedera:register` registers any
  seed without one (creator = platform account, contentHash = sha256(body)).
- `GET /openapi.json` (for the Bazantic gateway) and
  `GET /.well-known/agent.json` (ERC-8004 registration file, agent 111 on
  Hedera testnet via `ERC8004_AGENT_ID`) come from `src/meta.ts`.
- Bazantic: gateway `tuguge4rzbcsvgrevhkkjf43em` (api-key upstream auth,
  configured in the dashboard). Bazantic
  charges agents on Base; when it calls us with the `x-bajigur-gateway-key`
  header (`GATEWAY_KEY`), `onProtectedRequest` grants access instead of asking
  for a Hedera payment. `bazantic.yaml` documents the listing; the published Recipe is
  `design-prompt-finder` (source `docs/bazantic/recipe.json`).
- ENS (ENSv2 beta, Sepolia): `src/ens.ts` resolves text records through
  `UniversalResolverV2` (viem, 60s cache). Creators are ENS names under
  `bajigur.eth` (our own subregistry); the 402 `payTo` comes from the
  creator's `bajigur.hedera` record, `/licenses/:x` accepts a name, and the
  agent card lists `agent.bajigur.eth`. Enabled by `ENS_NAME`; without it the
  API falls back to `X402_PAY_TO_ADDRESS`. `scripts/ens-setup.sh` did the
  onchain setup (name, OwnedResolver, UserRegistry subregistry, subnames,
  records) with the platform key via `ens-cli` + `cast`.
- Still to come: Privy calls, creator publishing from the web app.

## Layout

```
src/
  app.ts      Hono app and routes; createApp(facilitator?)
  prompts.ts  in-memory catalogue
  hcs.ts      HCS audit publisher
  registry.ts PromptRegistry client + signed wallet identity
  meta.ts     openapi.json and the ERC-8004 agent card
  ens.ts      ENSv2 text-record resolver (Sepolia)
  x402.ts     x402 middleware
  index.ts    Bun server entry (port binding only)
test/
```
