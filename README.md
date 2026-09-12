# Bajigur

A marketplace of motion and web design prompts that an AI agent can find, pay
for, and use on its own. One prompt, one payment, no subscription.

Payment is **x402 v2 on Hedera**, settled by the **Blocky402** facilitator in
USDC or HBAR, straight to the creator's own account. A purchase mints an
**ERC-1155 licence** to the buyer, so the same prompt is free to re-read from
any client afterwards. Creators are **ENSv2 names** under `bajigur.eth`, and
buyers rate them through **ERC-8004** on Hedera.

Built for [ETHGlobal ETHOnline 2026](https://ethglobal.com/events/ethonline2026),
for the **Hedera**, **Privy** and **ENS** tracks.

## Try it in two minutes

Nothing below needs an account, a key, or a checkout.

**See the payment challenge itself.** This is the x402 402 response, with the
creator's Hedera account inside it:

```bash
curl -sD- -o/dev/null https://api.bajigur.xyz/prompts/nova-ai-cinematic-landing/unlock \
  | grep -i payment-required | cut -d' ' -f2 | base64 -d | jq '.accepts'
```

**Let an agent buy one.** Paste `https://mcp.bajigur.xyz/mcp` into any MCP
client (Claude Desktop, Claude Code, Cursor) and ask it to find a cinematic
landing page prompt on Bajigur. Sign-in is OAuth against the web app;
[`apps/mcp/README.md`](apps/mcp/README.md) has the config block.

**Look at a creator.** Their payout account, their prompts, and what buyers said:

```bash
curl -s https://api.bajigur.xyz/creators/kiel.bajigur.eth | jq
```

**Or use it as a person.** [app.bajigur.xyz](https://app.bajigur.xyz) signs you in
with Privy, creates the wallet, claims your name, and buys with a button. The
marketing site is [bajigur.xyz](https://bajigur.xyz).

Every claim in this README can be checked against the chains yourself:
**[`docs/verify.md`](docs/verify.md)** is a list of copy-paste commands that do it.

## What is live

| | |
| --- | --- |
| Web app | https://app.bajigur.xyz |
| API (x402-gated) | https://api.bajigur.xyz |
| Remote MCP server | https://mcp.bajigur.xyz/mcp |
| Catalogue, free | https://api.bajigur.xyz/prompts |
| Discovery, x402 bazaar shape | https://api.bajigur.xyz/discovery/resources |
| OpenAPI | https://api.bajigur.xyz/openapi.json |
| Creator profile with onchain reputation | https://api.bajigur.xyz/creators/kiel.bajigur.eth |

Onchain, all on public testnets:

| Contract | Where |
| --- | --- |
| `PromptRegistry`, listings and ERC-1155 licences | Hedera testnet [`0x59de4C018968E0357EeF77042dD2Fc2ff33e1418`](https://hashscan.io/testnet/contract/0x59de4C018968E0357EeF77042dD2Fc2ff33e1418), verified |
| `BajigurRegistrar`, one free `.bajigur.eth` per wallet | Sepolia [`0x418b68e12e29901362174d36b6fda230e3250976`](https://sepolia.etherscan.io/address/0x418b68e12e29901362174d36b6fda230e3250976), verified |
| ERC-8004 `IdentityRegistry` | Hedera testnet [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://hashscan.io/testnet/contract/0.0.7919997), service agent **111**, creator agent **115** |
| ERC-8004 `ReputationRegistry` | Hedera testnet [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://hashscan.io/testnet/contract/0.0.7919998) |
| HCS audit topic | [`0.0.10462113`](https://hashscan.io/testnet/topic/0.0.10462113) |
| ENSv2 `bajigur.eth` | Sepolia, resolver [`0x7f38…87f6`](https://sepolia.etherscan.io/address/0x7f381419050525025bBB6811CF5821E0615487f6), subregistry [`0x9673…461c`](https://sepolia.etherscan.io/address/0x9673702a3C850fa1c41d94C908083Fc85F59461c) |

Names in use: `kiel.bajigur.eth` and `axel.bajigur.eth` for creators,
`agent.bajigur.eth` for the service, and `claude.bajigur.eth` for a user wallet
that claimed its own name from the profile.

## Proof, one transaction per claim

| What happened | Transaction |
| --- | --- |
| Agent paid 0.02 USDC over x402 | [0.0.9185802@1789055565](https://hashscan.io/testnet/transaction/0.0.9185802-1789055565-700887673) |
| Agent paid 0.2 HBAR over x402 | [0.0.9185802@1789056622](https://hashscan.io/testnet/transaction/0.0.9185802-1789056622-039948026) |
| Privy wallet paid over x402 | [0.0.9185802@1789059182](https://hashscan.io/testnet/transaction/0.0.9185802-1789059182-997299836) |
| Agent token only, API signed through Privy, no local key | [0.0.9185802@1789131132](https://hashscan.io/testnet/transaction/0.0.9185802-1789131132-231709809) |
| A wallet with a claimed name paid its creator | [0.0.7162784@1789206663](https://hashscan.io/testnet/transaction/0.0.7162784-1789206663-898896205) |
| A buyer rated that creator on ERC-8004, signed by their own Privy wallet | [0.0.10497977@1789213244](https://hashscan.io/testnet/transaction/0.0.10497977-1789213244-887394093) |
| A wallet claimed `claude.bajigur.eth`, payout record written in the same transaction | [Sepolia `0xda2fd533…2531`](https://sepolia.etherscan.io/tx/0xda2fd533ee092a1719a612d7ef3ea8aa6e4781598389453808030a8f3a952531) |

## What each track gets

**Hedera — AI and Agentic Payments.** The service is an x402 v2 resource server
settled by Blocky402 on Hedera testnet, and the MCP client completes real paid
requests against it. Every prompt is priced twice, in USDC (HTS token
`0.0.429274`) and in HBAR, and the client chooses. Each settlement writes a JSON
record to an HCS topic and mints an ERC-1155 licence to the buyer. The catalogue
is published in the x402 bazaar discovery shape, and the service is registered on
ERC-8004 as agent 111. Contracts never sit in the payment path: on Hedera `payTo`
must be a `0.0.x` account, so the facilitator settles a native HTS transfer.

**Privy — Financial Flow and B2B.** A user signs in and grants Bajigur a signer
on their embedded wallet through a Privy key quorum. The API then creates their
Hedera account, funds it, associates USDC, and from then on signs x402 payments
for them with `secp256k1_sign`. The agent token that authorises this carries a
per-payment cap, and the API decodes the Hedera transaction body before signing
to check that it debits the user's own account, credits a known creator, and
stays under the cap. That check lives in our API because Privy policies cannot
gate `secp256k1_sign`. The same delegated wallet signs the buyer's ERC-8004
rating. One wallet with many capped tokens is the B2B half.

**ENS — Best Use of ENSv2.** `bajigur.eth` has its own ENSv2 subregistry on
Sepolia behind `BajigurRegistrar`, which enforces our rules: one free name per
wallet, three to thirty-two characters, ten years. A creator's payout account is
not stored in the API at all. It is the `bajigur.hedera` text record on their
name, read at 402 time, so changing the record changes where the next payment
lands. A user who has never held ETH claims a name from their profile: the
platform pays the Sepolia gas, `claimFor` registers the name to the user's own
wallet, and writes their Hedera account into the record in the same transaction,
because a name without that record would send their buyers' money to us. The
name is then their identity as a publisher, as a buyer, and as a reputation:
`erc8004` on the name points at their agent, and the agent's onchain metadata
points back at the name.

## How a purchase works

1. An agent calls `GET /prompts/nova-ai-cinematic-landing/unlock`.
2. The API answers `402` with a `PAYMENT-REQUIRED` header: two `accepts`
   entries, USDC and HBAR, `payTo` resolved live from the creator's ENS record,
   `extra.feePayer` from Blocky402, and bazaar discovery metadata.
3. The client picks one, builds a Hedera `TransferTransaction`, signs it with a
   local key or through Privy, and retries with `PAYMENT-SIGNATURE`.
4. The API asks Blocky402 to verify, serves the prompt body, then asks it to
   settle. Blocky402 co-signs as fee payer and submits; the creator is paid.
5. After settlement: one JSON record to the HCS topic, and `PromptRegistry.issue()`
   mints the licence. `PAYMENT-RESPONSE` carries the Hedera transaction id.
6. Next time the client proves the same wallet with a signed header, the API
   checks `balanceOf` on chain and returns the prompt with no 402 at all.

## Architecture

```
  any MCP client ──▶ apps/mcp ──HTTP + x402──▶ apps/api ──▶ prompt body
  apps/web (Privy) ──────────────────────────▶   │
                                                 ├─ verify / settle ─▶ Blocky402 ─▶ Hedera (HTS transfer to the creator)
                                                 ├─ after settle ────▶ HCS topic 0.0.10462113
                                                 ├─ after settle ────▶ PromptRegistry.issue(), ERC-1155 licence
                                                 ├─ 402 payTo ───────▶ ENSv2 on Sepolia, bajigur.hedera record
                                                 └─ ratings ─────────▶ ERC-8004 on Hedera, signed by the buyer
```

| Piece | Role |
| --- | --- |
| `apps/api` | Bun + Hono. Free catalogue and discovery; `GET /prompts/:id/unlock` is x402-gated at the prompt's own price with the creator's account as `payTo`. Also publishing, name claiming, buyer lists, and creator reputation. |
| `apps/mcp` | The same service as MCP tools: `search_prompts`, `get_prompt` which pays if needed, and `my_licenses`. Runs locally over stdio with a key, or hosted with a bearer agent token and no key on the machine at all. |
| `apps/web`, `apps/landingpage` | Next.js. Privy sign-in, wallet setup, name claiming, purchases, publishing, licences. |
| `contracts/` | Foundry. `PromptRegistry` on Hedera, `BajigurRegistrar` on Sepolia, and the ERC-8004 registration script. |

## Run it

```bash
git submodule update --init --recursive   # contracts/lib
bun install
cp .env.example .env                      # Hedera accounts, see below
bun run dev --filter=@bajigur/api         # http://localhost:3002
```

Hedera testnet accounts come from [portal.hedera.com](https://portal.hedera.com)
as ECDSA keys.

| Var | Purpose |
| --- | --- |
| `HEDERA_OPERATOR_ID` / `HEDERA_OPERATOR_KEY` | The paying agent, for the local MCP server |
| `X402_PAY_TO_ADDRESS` / `X402_PAY_TO_KEY` | Platform account: default payout, HCS writer, licence minter |
| `HCS_TOPIC_ID`, `PROMPT_REGISTRY_ADDRESS`, `ERC8004_AGENT_ID` | Already deployed, values above |

```bash
bun run hedera:associate                # associate both accounts with testnet USDC
bun run buy nova-ai-cinematic-landing   # buy from the terminal through the MCP tools
X402_PAY_WITH=hbar bun run buy nova-ai-cinematic-landing
bun run privy:spike                     # pay from a Privy wallet instead
```

Needs [Bun](https://bun.sh) 1.3 or newer, and [Foundry](https://getfoundry.sh)
for the contracts.

## Commands

| Command | Effect |
| --- | --- |
| `bun run dev`, `bun run dev --filter=@bajigur/api` | Start apps |
| `bun run test`, `bun run typecheck`, `bun run lint`, `bun run format` | Workspace checks |
| `bun run contracts:build`, `bun run contracts:test` | Foundry |
| `bun run hedera:associate`, `bun run hedera:topic`, `bun run hedera:register` | Testnet setup |
| `bun run buy <id>`, `bun run privy:associate`, `bun run privy:spike` | Paid requests from the terminal |
| `bash apps/api/scripts/ens-setup.sh` | ENS name, subregistry, subnames, records |
| `railway up --service api --detach` | Deploy the API |

## Layout

```
apps/web, apps/landingpage   Next.js (Axel)
apps/api                     Bun + Hono: x402 gateway, licences, ENS, reputation  (:3002)
apps/mcp                     MCP server, x402 client, Privy signer
packages/core, packages/tsconfig
contracts/                   Foundry: PromptRegistry, BajigurRegistrar
docs/                        verify.md, design spec, deployment notes
```

Every directory with real work carries its own `CLAUDE.md` explaining how that
part behaves and why. The design notes are in
[`docs/superpowers/specs/2026-09-10-bajigur-product-design.md`](docs/superpowers/specs/2026-09-10-bajigur-product-design.md).

## Team

| Person | Owns |
| --- | --- |
| Axel (`Lexirieru`) | Frontend — `apps/web`, `apps/landingpage` |
| Kiel | Contracts and backend — `contracts/`, `apps/api`, `apps/mcp` |

Commits follow [Conventional Commits](https://www.conventionalcommits.org).
Everything in this repository is written in English.
