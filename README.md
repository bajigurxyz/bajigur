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
- Creators and agents are **ENSv2 names** under `bajigur.eth` (our own
  subregistry on Sepolia); the creator's Hedera payout account is read live
  from its `bajigur.hedera` text record.

Built for [ETHGlobal ETHOnline 2026](https://ethglobal.com/events/ethonline2026),
targeting the **Hedera**, **Privy**, and **ENS** tracks (plus a Bazantic
gateway). Design notes:
[`docs/superpowers/specs/2026-09-10-bajigur-product-design.md`](docs/superpowers/specs/2026-09-10-bajigur-product-design.md).

## Live

| What | Where |
| --- | --- |
| API (x402-gated, Hedera testnet) | https://api-production-fe21.up.railway.app |
| Catalogue (free) | https://api-production-fe21.up.railway.app/prompts |
| Discovery directory (x402 bazaar shape) | https://api-production-fe21.up.railway.app/discovery/resources |
| OpenAPI | https://api-production-fe21.up.railway.app/openapi.json |
| Remote MCP server (Streamable HTTP, paste the URL into any MCP client) | https://mcp-production-bbfe.up.railway.app/mcp |
| Bazantic gateway (x402/MPP on Base, MCP) | https://tuguge4rzbcsvgrevhkkjf43em.bazgateway.com |
| Bazantic Recipe | `design-prompt-finder` |
| ERC-8004 agent card | https://api-production-fe21.up.railway.app/.well-known/agent.json (agent **111** on Hedera testnet) |
| `PromptRegistry` (verified source) | [0x59de4C018968E0357EeF77042dD2Fc2ff33e1418](https://hashscan.io/testnet/contract/0x59de4C018968E0357EeF77042dD2Fc2ff33e1418) |
| HCS settlement audit topic | [0.0.10462113](https://hashscan.io/testnet/topic/0.0.10462113) |
| ENSv2 name (Sepolia) | `bajigur.eth`, owner `0xE610…2bAa`, resolver [`0x7f38…87f6`](https://sepolia.etherscan.io/address/0x7f381419050525025bBB6811CF5821E0615487f6), subregistry [`0x9673…461c`](https://sepolia.etherscan.io/address/0x9673702a3C850fa1c41d94C908083Fc85F59461c) |
| ENS subnames | `kiel.bajigur.eth` (creator, `bajigur.hedera=0.0.7275085`), `axel.bajigur.eth` (creator, self-claimed by `0xE5d8…e950`, `bajigur.hedera=0.0.8291460`), `agent.bajigur.eth` (agent) |
| `BajigurRegistrar` (Sepolia, verified) | [0x1eb7D3769a12CBD08C28FEEF7c4c8ebdAa989756](https://sepolia.etherscan.io/address/0x1eb7D3769a12CBD08C28FEEF7c4c8ebdAa989756): anyone claims one free `<name>.bajigur.eth` |

Proof transactions on Hedera testnet:

| Flow | Transaction |
| --- | --- |
| Agent pays 0.02 USDC over x402 | [0.0.9185802@1789055565.700887673](https://hashscan.io/testnet/transaction/0.0.9185802-1789055565-700887673) |
| Agent pays 0.2 HBAR over x402 | [0.0.9185802@1789056622.039948026](https://hashscan.io/testnet/transaction/0.0.9185802-1789056622-039948026) |
| Privy wallet pays over x402 | [0.0.9185802@1789059182.997299836](https://hashscan.io/testnet/transaction/0.0.9185802-1789059182-997299836) |
| Agent token only (API signs via Privy) | [0.0.9185802@1789131132.231709809](https://hashscan.io/testnet/transaction/0.0.9185802-1789131132-231709809) |

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
| `apps/mcp` | Local stdio MCP server with an x402 client. Tools: `search_prompts`, `get_prompt` (pays if needed), `my_licenses`. Pays either with a local Hedera key or, with `BAJIGUR_AGENT_TOKEN`, through the API and the user's delegated Privy wallet. |
| `contracts/` | Foundry. `PromptRegistry` (Hedera): OpenZeppelin ERC-1155 + AccessControl; creators register and price their prompts, the API's `MINTER_ROLE` issues licences. `BajigurRegistrar` (Sepolia): ENSv2 subname registrar for `bajigur.eth`. `RegisterAgent` registers the service on ERC-8004. |
| `apps/web`, `apps/landingpage` | Next.js. Privy sign-in, catalogue, purchases, licences. |

Contracts never sit in the payment path: on Hedera, x402 `payTo` must be a
`0.0.x` account, and the facilitator settles a native HTS transfer.

## Payment flow

1. Agent calls `GET /prompts/nova-ai-cinematic-landing/unlock`.
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

Step 2's `payTo` is not stored anywhere in the API: it is the `bajigur.hedera`
text record of the prompt's creator name (`kiel.bajigur.eth`) on ENSv2 Sepolia.

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
bun run buy nova-ai-cinematic-landing   # pay from the terminal through the MCP tools
X402_PAY_WITH=hbar bun run buy nova-ai-cinematic-landing
bun run privy:spike            # pay with a Privy server wallet (needs PRIVY_* vars)
```

Claude Desktop: copy the block in [`apps/mcp/README.md`](apps/mcp/README.md)
into `claude_desktop_config.json`, restart, then ask
"find a cinematic landing page prompt on Bajigur and buy it". New users need no Hedera key:
sign in on the web app, delegate the Privy wallet, and paste the agent token
as `BAJIGUR_AGENT_TOKEN`.

Requires [Bun](https://bun.sh) >= 1.3 and, for the contracts,
[Foundry](https://getfoundry.sh).

## Tracks

| Track | What ships |
| --- | --- |
| Hedera — AI & Agentic Payments | Live x402 service settled by Blocky402; MCP client completes real paid requests. Extras: per-prompt pricing, USDC (HTS) and HBAR in the settlement path, HCS audit trail, discovery directory, ERC-8004 agent 111. |
| Bazantic — Recipes | Live gateway `tuguge4rzbcsvgrevhkkjf43em` (https://tuguge4rzbcsvgrevhkkjf43em.bazgateway.com, MCP at `/mcp`) over this API's OpenAPI; catalogue free, unlock $0.10; published Recipe **`design-prompt-finder`** (source: [`docs/bazantic/recipe.json`](docs/bazantic/recipe.json)). |
| Privy — Financial Flow, B2B | Users delegate their Privy embedded wallet to Bajigur's signer (a Privy key quorum); the API onboards it on Hedera, funds it, and signs x402 payments through Privy `secp256k1_sign` only for transfers that pass per-token caps (proof: `0.0.9185802@1789131132.231709809`, paid with an agent token and no local key). One wallet, many capped agent tokens is the B2B story. |
| ENS — Best Use of ENSv2 | `bajigur.eth` with its own ENSv2 subregistry on Sepolia and a `BajigurRegistrar` with our rules (one free name per wallet, own resolver, 10 years). Creators (`kiel.`, `axel.`) and agents (`agent.`) are subnames they own; the API resolves each creator's Hedera payout from its `bajigur.hedera` text record at 402 time and accepts names in `/licenses/:name`. Nothing hardcoded: change the record, the payout changes. |

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
| `bash apps/api/scripts/ens-setup.sh` | Register the ENS name, subregistry, subnames, records |
| `railway up --service api --detach` | Deploy the API |

## Team

| Person | Owns |
| --- | --- |
| Axel (`Lexirieru`) | Frontend — `apps/web`, `apps/landingpage` |
| Kiel | Contracts and backend — `contracts/`, `apps/api`, `apps/mcp` |

Commits follow [Conventional Commits](https://www.conventionalcommits.org).
Everything in this repository is written in English.
