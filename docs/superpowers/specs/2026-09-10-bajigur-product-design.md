# Bajigur — product design

Date: 2026-09-10. Status: agreed direction for ETHOnline 2026.

## One line

Bajigur is a pay-per-use marketplace of motion/web design prompts, built so an
AI agent can discover, pay for, and use a prompt on its own.

## Why it is a real service

Coding agents are routinely asked to "make a great landing page" and produce
generic output. A well-written motion/design prompt is a small asset that
measurably improves that output. It is cheap, bought exactly when needed, and
useful to a machine without a human in the loop. That is the shape x402 was
designed for.

## Roles

| Role | Who | What they get |
| --- | --- | --- |
| Creator | Motion/web designers, anyone | Publish a prompt, set a price, get paid straight to their own Hedera account on every sale. The platform never holds their money. |
| Agent | Claude Desktop via our MCP server, any agent via Bazantic | Search the catalogue, pay cents in USDC or HBAR, use the prompt. No API key, no subscription. |
| Human | Developers in the web app | Browse, buy, and see the licences they hold in their Privy wallet. |

## How it works

1. **Publish.** Creator signs in with Privy, submits title, tags, preview,
   price, and a Hedera payout account. The full prompt body is stored by the
   API and is never public.
2. **Discover, free.** The catalogue (title, tags, preview, price) is exposed
   through a plain endpoint, the x402 discovery extension, the MCP tool
   `search_prompts`, and a Bazantic Recipe. Agents evaluate before paying.
3. **Buy.** Agent requests the full prompt. API answers `402` with
   `accepts` = [USDC, HBAR], `payTo` = the creator's Hedera account. Agent
   signs with its Privy wallet, Blocky402 settles on Hedera, API returns the
   prompt body.
4. **After settlement.** API writes one record to an HCS topic (audit trail)
   and mints an ERC-1155 licence for `promptId` to the buyer's wallet.
5. **Re-access, free.** Wallet proves ownership with a signature, API checks
   the licence onchain, serves the prompt without a `402`. Pay once, own it,
   use it from any client.

## Payment rail facts (Hedera + Blocky402)

- Facilitator testnet `https://api.testnet.blocky402.com`, network
  `hedera:testnet`, x402 v2, scheme `exact`.
- Settlement is a native HTS `TransferTransaction` signed by the payer; the
  facilitator pays the fee. **`payTo` is a Hedera account (`0.0.x`) and cannot
  be a contract.** Contracts therefore never sit in the payment path.
- Assets: HBAR (`0.0.0`) or HTS tokens. Testnet USDC is `0.0.429274`.
- Accounts auto-created from an EVM address (Privy wallets) have unlimited
  auto-association (HIP-904), so they can receive HTS tokens without setup.
- Privy can sign Hedera transactions. Verified 2026-09-10: a Privy ethereum
  server wallet paid 0.02 USDC over x402 (`0.0.9185802@1789059182.997299836`)
  through `secp256k1_sign` on `/rpc` with a locally computed
  keccak256(bodyBytes). `/raw_sign` rejects ethereum wallets. The wallet's
  Hedera account is auto-created by sending HBAR to its EVM address and
  completed by its first signed transaction (`bun run privy:associate`).

## What we maximise from x402 v2

- Dynamic `payTo` per request: creators are paid directly, no custody.
- Multi-asset `accepts[]`: USDC and HBAR.
- `resource.description` / `mimeType`: the agent knows what it buys.
- Discovery extension: the service is indexable by facilitators and agents.
- Wallet identity to skip payment: the basis of "licence = access".
- Per-prompt pricing set by creators, not a flat rate.

## Sponsor tracks

| Track | What ships | Owner |
| --- | --- | --- |
| Hedera — AI & Agentic Payments ($6k) | x402-gated prompt endpoints on Hedera testnet via Blocky402; MCP client completes a real paid request; extras: HCS audit trail, discovery directory, per-prompt pricing, USDC (HTS) + HBAR in `accepts`, ERC-8004 registration if time allows | Kiel |
| Bazantic — Recipes ($3k) | x402 Gateway on bazantic.com pointing at the API; Recipe describing when and how an agent uses it; before/after recording | Kiel + Axel |
| Privy — Financial Flow ($2.5k) | Fund a Privy wallet, pay for a prompt, licence lands in the wallet | Axel (web) + Kiel (api) |
| Privy — B2B Financial Product ($2.5k) | Organisation wallet with a spending policy so a team's agents can only buy prompts up to a limit | Axel + Kiel |

Every track needs a public repo, a README, and a demo video (≤5 min) showing
the paid request.

## Build order

Status 2026-09-11: steps 1 to 4 shipped and verified on testnet (HCS trail,
discovery, HBAR, verified `PromptRegistry`
`0x59de4C018968E0357EeF77042dD2Fc2ff33e1418`, licence minting, free
re-access). API live at https://api-production-fe21.up.railway.app. Privy
server wallet paid over x402. ERC-8004 agent 111 registered. Bazantic
gateway `tuguge4rzbcsvgrevhkkjf43em` active and Recipe `design-prompt-finder`
published (track dropped in favour of ENS). ENS: `bajigur.eth` on ENSv2 Sepolia
with our own subregistry and `BajigurRegistrar` (0x1eb7…9756, one free name per
wallet); `kiel.`, `axel.` (self-claimed) and `agent.` subnames; the 402 payTo is
read from the creator's `bajigur.hedera` record. Web/Privy UI
pending (Axel).

1. `apps/api`: x402 v2 middleware, prompt endpoints, Blocky402 settlement.
2. `apps/mcp`: MCP server with an x402 client so Claude Desktop can pay.
3. API extras: HCS audit topic, discovery endpoint, USDC + HBAR.
4. `contracts/`: `PromptRegistry` (ERC-1155 licence + creator registry), tests,
   deploy script.
5. Privy: web sign-in, wallet funding, spending policy.
6. Bazantic gateway + Recipe. ERC-8004 registration if time allows.

## Contracts (`contracts/`)

One contract, `PromptRegistry`, OpenZeppelin ERC-1155 + AccessControl:

- `register(bytes32 contentHash, uint256 price, string uri)` by any creator.
  Creator owns the `promptId`, can update price and payout address.
- API reads price and creator from chain to build the `402`.
- `MINTER_ROLE` (API) mints one licence per settled purchase; the Hedera
  transaction id goes in the event, not storage.
- Gas: creator pays once at register, platform pays the mint, buyer pays
  nothing.

Not in scope: platform fee (impossible to split in Hedera x402; a listing fee
can come later), escrow, bounties, HTS-native licence NFTs.

## Explicitly out of scope for the hackathon

A2A/ACP negotiation, Scheduled Transactions, streaming payments, a second
chain (Arc), Ledger integration, becoming a general x402 gateway for third
parties (that is Bazantic's job).

## Open questions

- Where the initial prompt content comes from: written by the team, patterned
  on motionsites, or supplied by external creators during the demo.
- Which Hono x402 middleware to use (`@x402/hono` if it exists, otherwise
  `@x402/core` + `@x402/hedera` wired by hand).
