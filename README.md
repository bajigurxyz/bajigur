# Bajigur

A pay-per-use marketplace of motion/web design prompts, built so an AI agent
can discover, pay for, and use a prompt on its own.

- Payments are **x402 v2 on Hedera** through the **Blocky402** facilitator, in
  USDC or HBAR, paid straight to each prompt's creator.
- Agents reach it through an **MCP server** (Claude Desktop) and a **Bazantic**
  gateway; humans through the web app.
- Every purchase mints an **ERC-1155 licence** to the buyer's wallet, so a
  prompt is paid once and re-read for free from any client. **Privy** wallets
  can pay directly.

Built for [ETHGlobal ETHOnline 2026](https://ethglobal.com/events/ethonline2026),
targeting the **Hedera**, **Bazantic**, and **Privy** tracks. Design notes:
[`docs/superpowers/specs/2026-09-10-bajigur-product-design.md`](docs/superpowers/specs/2026-09-10-bajigur-product-design.md).

## Live

| What | Where |
| --- | --- |
| API (x402-gated, Hedera testnet) | https://api-production-fe21.up.railway.app |
| Catalogue (free) | https://api-production-fe21.up.railway.app/prompts |
| Discovery directory (x402 bazaar shape) | https://api-production-fe21.up.railway.app/discovery/resources |
| OpenAPI | https://api-production-fe21.up.railway.app/openapi.json |
| ERC-8004 agent card | https://api-production-fe21.up.railway.app/.well-known/agent.json (agent **111** on Hedera testnet) |
| `PromptRegistry` (verified source) | [0x59de4C018968E0357EeF77042dD2Fc2ff33e1418](https://hashscan.io/testnet/contract/0x59de4C018968E0357EeF77042dD2Fc2ff33e1418) |
| HCS settlement audit topic | [0.0.10462113](https://hashscan.io/testnet/topic/0.0.10462113) |

Proof transactions on Hedera testnet:

| Flow | Transaction |
| --- | --- |
| Agent pays 0.02 USDC over x402 | [0.0.9185802@1789055565.700887673](https://hashscan.io/testnet/transaction/0.0.9185802-1789055565-700887673) |
| Agent pays 0.2 HBAR over x402 | [0.0.9185802@1789056622.039948026](https://hashscan.io/testnet/transaction/0.0.9185802-1789056622-039948026) |
| Privy wallet pays over x402 | [0.0.9185802@1789059182.997299836](https://hashscan.io/testnet/transaction/0.0.9185802-1789059182-997299836) |

## Architecture

```
  Claude Desktop ──stdio──▶ apps/mcp ──HTTP + x402──▶ apps/api ──▶ prompt body
  (or any agent)            x402 client               Hono + @x402/hono
  Bazantic gateway ───────────────────────────────────▶   │
  apps/web (Privy) ───────────────────────────────────▶   │
                                                          ├─ verify / settle ──▶ Blocky402 facilitator ──▶ Hedera (HTS transfer to creator)
                                                          ├─ after settle ─────▶ HCS topic 0.0.10462113 (audit record)
                                                          └─ after settle ─────▶ PromptRegistry.issue() (ERC-1155 licence to buyer)
```

| Piece | Role |
| --- | --- |
| `apps/api` | Bun + Hono. Free catalogue and discovery; `GET /prompts/:id/unlock` is x402-gated with the prompt's own price and the creator's Hedera account as `payTo`. After settlement it writes to HCS and mints the licence. Licence holders skip the 402 by proving their wallet with a signed header. |
| `apps/mcp` | Local stdio MCP server with an x402 client. Tools: `search_prompts`, `get_prompt` (pays if needed), `my_licenses`. Also the Privy signer (`externalHederaSigner`). |
| `contracts/` | Foundry. `PromptRegistry`: OpenZeppelin ERC-1155 + AccessControl. Creators register and price their prompts; the API's `MINTER_ROLE` issues licences. `RegisterAgent` registers the service on ERC-8004. |
| `apps/web`, `apps/landingpage` | Next.js. Privy sign-in, catalogue, purchases, licences. |

Contracts never sit in the payment path: on Hedera, x402 `payTo` must be a
`0.0.x` account, and the facilitator settles a native HTS transfer.

## Payment flow

1. Agent calls `GET /prompts/marquee-logos/unlock`.
2. API answers `402` with a `PAYMENT-REQUIRED` header (x402 v2): two
   `accepts` entries, USDC (`0.0.429274`) and HBAR, `payTo` = the creator's
   account, `extra.feePayer` from Blocky402, plus bazaar discovery metadata.
3. The client picks one, builds a Hedera `TransferTransaction`, signs it
   (raw key, or Privy `secp256k1_sign`), and retries with `PAYMENT-SIGNATURE`.
4. API asks Blocky402 to verify, serves the prompt body, then asks it to settle.
   Blocky402 co-signs as fee payer and submits; the creator receives the funds.
5. `onAfterSettle`: one JSON record to the HCS topic and `PromptRegistry.issue()`
   for the buyer. `PAYMENT-RESPONSE` carries the Hedera transaction id.
6. Next time, the client sends `x-hedera-account/-timestamp/-signature`; the API
   checks `balanceOf` on chain and returns the prompt without a 402.

## Run it

```bash
git submodule update --init --recursive   # restore contracts/lib
bun install
cp .env.example .env                       # fill Hedera accounts, see below
bun run dev --filter=@bajigur/api          # http://localhost:3002
```

Accounts on Hedera testnet (ECDSA keys from https://portal.hedera.com):

| Var | Purpose |
| --- | --- |
| `HEDERA_OPERATOR_ID` / `HEDERA_OPERATOR_KEY` | The paying agent (MCP) |
| `X402_PAY_TO_ADDRESS` / `X402_PAY_TO_KEY` | Platform account: default creator payout, HCS writer, licence minter |
| `HCS_TOPIC_ID`, `PROMPT_REGISTRY_ADDRESS`, `ERC8004_AGENT_ID` | Already deployed values, see Live |

```bash
bun run hedera:associate       # associate both accounts with testnet USDC, then fund the payer at https://faucet.circle.com
bun run buy marquee-logos      # pay from the terminal through the MCP tools
X402_PAY_WITH=hbar bun run buy marquee-logos
bun run privy:spike            # pay with a Privy server wallet (needs PRIVY_* vars)
```

Claude Desktop: copy the block in [`apps/mcp/README.md`](apps/mcp/README.md)
into `claude_desktop_config.json`, restart, then ask
"find a marquee prompt on Bajigur and buy it".

Requires [Bun](https://bun.sh) >= 1.3 and, for the contracts,
[Foundry](https://getfoundry.sh).

## Tracks

| Track | What ships |
| --- | --- |
| Hedera — AI & Agentic Payments | Live x402 service settled by Blocky402; MCP client completes real paid requests. Extras: per-prompt pricing, USDC (HTS) and HBAR in the settlement path, HCS audit trail, discovery directory, ERC-8004 agent 111. |
| Bazantic — Recipes | Gateway manifest [`bazantic.yaml`](bazantic.yaml) over this API's OpenAPI; Recipe [`docs/bazantic/recipe.json`](docs/bazantic/recipe.json). |
| Privy — Financial Flow, B2B | A Privy wallet funds, pays over x402 and receives the licence (proof above); organisation wallet with a spending policy in the web app. |

## Layout

```
apps/web, apps/landingpage   Next.js (Axel)
apps/api                     Bun + Hono, x402 gateway, HCS, licences     (:3002)
apps/mcp                     MCP server + x402 client + Privy signer
packages/core, packages/tsconfig
contracts/                   Foundry: PromptRegistry, RegisterAgent
docs/                        design spec, Bazantic recipe
```

## Commands

| Command | Effect |
| --- | --- |
| `bun run dev` / `bun run dev --filter=@bajigur/api` | Start apps |
| `bun run test`, `bun run typecheck`, `bun run lint`, `bun run format` | Workspace checks |
| `bun run contracts:build`, `bun run contracts:test` | Foundry |
| `bun run hedera:associate`, `bun run hedera:topic`, `bun run hedera:register` | Testnet setup |
| `bun run buy <id>`, `bun run privy:associate`, `bun run privy:spike` | Paid requests from the terminal |
| `railway up --service api --detach` | Deploy the API |

## Team

| Person | Owns |
| --- | --- |
| Axel (`Lexirieru`) | Frontend — `apps/web`, `apps/landingpage` |
| Kiel | Contracts and backend — `contracts/`, `apps/api`, `apps/mcp` |

Commits follow [Conventional Commits](https://www.conventionalcommits.org).
Everything in this repository is written in English.
