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
| `/prompts` | The marketplace, from `GET /prompts`, filtered by tag. |
| `/prompts/[id]` | One prompt plus the unlock control. |
| `/connect` | Privy sign-in, granting Bajigur a signer, and the Claude Desktop config. |
| `/my-prompts` | Bought (licences held) and Published (prompts whose `payTo` is this wallet). |
| `/profile` | Wallet, Hedera account, balances, and activation when there is no account yet. |

Deliberately absent: a publishing form and an earnings dashboard. `apps/api` has
no write route at all: the catalogue is a hardcoded array whose bodies are read
from `src/catalog/*.md` in the deployed bundle, so publishing today means
committing a file and redeploying. See `docs/plans/publishing-a-prompt.md`
before building a button for it.

## How a purchase works

1. `/connect` signs the user in with Privy and calls `delegateWallet`, so
   Bajigur may sign for that wallet.
2. `POST /api/agent/link` forwards the Privy access token to `apps/api`, which
   creates the wallet's Hedera account, associates USDC, and returns an agent
   token. Access is granted with `addSigners`, not `delegateWallet`: these
   wallets run in a TEE, where the delegation hook throws. That token is stored in an **httpOnly cookie** and never reaches
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
- `NEXT_PUBLIC_PRIVY_APP_ID` is required for sign-in, and
  `NEXT_PUBLIC_PRIVY_SIGNER_ID` for payments: it names the key quorum Bajigur
  signs with. Without the app id `Providers` mounts no `PrivyProvider` and the
  app degrades to a public catalogue rather than crashing; without the signer
  id both connect screens say so before the user clicks.
- A Hedera account is not created with the wallet. It exists once something is
  sent to the address, so `/profile` reads the mirror node directly and shows
  activation steps until then.

## Tests

`bun run test` → `vitest run`, jsdom, `@` → `./src`. Vitest globals are off:
import from `vitest` and call `cleanup` in your own `afterEach`.

## Verification gates

```
bun run typecheck && bun run lint && bun run test && bun run build
```
