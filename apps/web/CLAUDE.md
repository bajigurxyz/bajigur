@AGENTS.md

# CLAUDE.md — apps/web

`@bajigur/web`, the application: browse the catalogue, connect a Privy wallet,
buy a prompt over x402 on Hedera, and see the licences the wallet holds.
Owned by Axel. Port 3000.

Next.js 16 App Router · React 19 · Tailwind v4 · React Compiler · Privy.

The UI was imported from Axel's Promit project and kept; **none of its domain
logic was**. There is no wagmi, no viem-signed payment, no Base Sepolia, no
`/v1/*` endpoint, no content-hash check, no free tier. If you are pattern
matching from Promit, stop and read the API instead.

## Surfaces

| Route | What it is |
| --- | --- |
| `/` | Redirect to `/prompts`. Marketing is `apps/landingpage`, a separate origin. |
| `/prompts` | Catalogue from `GET /prompts`, filtered by tag. |
| `/prompts/[id]` | One prompt plus the unlock control. |
| `/connect` | Privy sign-in, wallet delegation, and the Claude Desktop config. |
| `/licenses` | What the wallet owns, read from `GET /licenses/:account`. |

Deliberately absent: a creator publishing form and an earnings dashboard.
`apps/api` has no endpoint behind either — the catalogue is an in-memory array
seeded by the team. Do not build a surface whose backend does not exist.

## How a purchase works

1. `/connect` signs the user in with Privy and calls `delegateWallet`, so
   Bajigur may sign for that wallet.
2. `POST /api/agent/link` forwards the Privy access token to `apps/api`, which
   creates the wallet's Hedera account, associates USDC, and returns an agent
   token. That token is stored in an **httpOnly cookie** and never reaches
   client JavaScript.
3. `POST /api/unlock/[id]` runs the x402 flow server side: it builds the Hedera
   `TransferTransaction`, asks `apps/api` to sign it through Privy, and the
   Blocky402 facilitator settles it as fee payer.
4. `apps/api` writes an HCS audit record and mints an ERC-1155 licence to the
   buyer. Afterwards the same bearer token identifies the wallet, so the API
   answers 200 with no 402 at all.

**The payment cannot move into the browser.** The x402 challenge travels in the
`PAYMENT-REQUIRED` response header and `apps/api` does not list it in
`Access-Control-Expose-Headers`, so `fetch` in a page cannot read it
cross-origin. Doing it server side also keeps the agent token secret and the
Hedera SDK out of the client bundle.

## Rules

- `src/lib/api.ts` is the only place that knows `apps/api` paths, and its
  `Prompt` type carries no `body` field. Prompt text arrives from
  `/api/unlock/[id]` and nowhere else.
- The agent token is a bearer credential for someone else's money. Route
  handlers read it from the cookie; the single exception is
  `/api/agent/token`, which exists so the user can paste it into their own
  Claude Desktop config.
- `src/lib/hedera.ts` mirrors `apps/mcp/src/externalSigner.ts`. Apps do not
  import from each other, so the two are twins by hand: change one, change
  both, or lift the pair into `packages/`.
- Keep `@x402/*` and `@hiero-ledger/sdk` pinned to the versions `apps/api` and
  `apps/mcp` use. A protocol mismatch fails at runtime, not at install.
- Prices arrive as decimal strings (`"0.10"`), not atomic units. Never rescale
  them.
- `react-hooks/set-state-in-effect` is enforced: no synchronous `setState`
  inside an effect. Use a promise callback, or React's adjust-state-during-
  render pattern keyed on the value that changed (see `/licenses` and
  `/prompts/[id]`).
- `NEXT_PUBLIC_PRIVY_APP_ID` is required for sign-in. Without it `Providers`
  mounts no `PrivyProvider` and the app degrades to a public catalogue rather
  than crashing.

## Tests

`bun run test` → `vitest run`, jsdom, `@` → `./src`. Vitest globals are off:
import from `vitest` and call `cleanup` in your own `afterEach`.

## Verification gates

```
bun run typecheck && bun run lint && bun run test && bun run build
```
