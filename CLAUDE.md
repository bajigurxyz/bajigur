# CLAUDE.md

Guidance for Claude Code when working in this repository. Every directory that
holds real work has its own `CLAUDE.md` with the rules for that area — read the
local one before touching files there.

## Project

Bajigur is a pay-per-use marketplace of motion/web design prompts, built so an
AI agent can discover, pay for, and use a prompt on its own. Payment is
**x402 v2** on **Hedera** settled through the **Blocky402** facilitator, with
each prompt's `payTo` set to its creator's own Hedera account. Agents reach it
through an **MCP server** (Claude Desktop). Buyers
hold an ERC-1155 licence in their **Privy** wallet, so a prompt is paid once
and re-used from any client.

The full design, including payment-rail facts, sponsor mapping, and build
order, is in `docs/superpowers/specs/2026-09-10-bajigur-product-design.md`.
Read it before proposing scope.

Built for **ETHGlobal ETHOnline 2026**. Targeted prize tracks:

| Track | What has to ship |
| --- | --- |
| **Hedera** — AI & Agentic Payments ($6,000) | A live x402-gated service on Hedera testnet settled through Blocky402, plus an MCP client that completes at least one real paid request end to end. Extras: HCS audit trail, discovery directory, per-prompt pricing, USDC + HBAR. |
| **Privy** ($5,000, two tracks) | Privy wallets fund and pay for prompts (Financial Flow); an organisation wallet with a spending policy (B2B Financial Product). |

Every track needs a public repo, a README, and a demo video (five minutes or
less) showing the paid request on camera.

Contracts never sit in the payment path: on Hedera, x402 `payTo` must be a
`0.0.x` account, not a contract. `contracts/` holds the `PromptRegistry`
(creator registry + licence) only.

## Team

| Person | Owns |
| --- | --- |
| Axel (`Lexirieru`) | Frontend — `apps/web`, `apps/landingpage` |
| Kiel | Smart contracts and backend — `contracts/`, `apps/api`, `apps/mcp` |

`apps/ai`, `apps/indexer`, and `skills/` are placeholders. They hold a README
describing intent and nothing else. Do not build them out unless asked.
`apps/mcp` is real work: the MCP server with the x402 client, built after
`apps/api`.

## Layout

```
apps/
  web/           Next.js 16 — main application            (:3000)
  landingpage/   Next.js 16 — marketing site              (:3001)
  api/           Bun + Hono — HTTP API, x402 gateway      (:3002)
  ai/            placeholder — AI generation / agent service
  indexer/       placeholder — onchain indexer
  mcp/           MCP server for Claude Desktop, x402 client
packages/
  core/          @bajigur/core — shared types and utilities
  tsconfig/      @bajigur/tsconfig — base / app / library TS configs
contracts/       Foundry project (forge-std and OpenZeppelin as submodules)
skills/          placeholder — Claude Agent Skills for the platform
```

## Commands

Run everything from the repository root; Turborepo fans tasks out per workspace.

| Command | Effect |
| --- | --- |
| `bun install` | Install all workspace dependencies |
| `bun run dev` | Start every app that defines a `dev` task |
| `bun run dev --filter=@bajigur/web` | Start a single app |
| `bun run build` | Build every app |
| `bun run test` | Run every workspace test suite |
| `bun run typecheck` | `tsc --noEmit` across the workspace |
| `bun run lint` | Biome check plus per-app ESLint |
| `bun run format` | Biome autofix and import sorting |
| `bun run contracts:build` | `forge build` inside `contracts/` |
| `bun run contracts:test` | `forge test` inside `contracts/` |

## Conventions

- **English only.** Code, comments, identifiers, docs, commit messages, and PR
  descriptions are all written in English, including in placeholder files.
- **Conventional Commits** for every commit:
  `<type>(<scope>): <subject>` — for example `feat(api): add x402 payment middleware`.
  Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
  `ci`, `chore`, `revert`. Scope is the workspace or directory being touched
  (`web`, `landingpage`, `api`, `ai`, `indexer`, `mcp`, `core`, `contracts`,
  `skills`, `repo`). Subject is imperative and lowercase, no trailing period.
- **Formatting is Biome's job.** Do not hand-format; run `bun run format`.
- **Internal imports go through workspace names**, never relative paths that
  climb out of a workspace: `import { isAddress } from "@bajigur/core"`.
- **Never commit secrets.** Add new variables to `.env.example` with an empty
  value and document them in the owning workspace's `CLAUDE.md`.
- **`contracts/lib/` is git submodules**, not vendored source. After cloning run
  `git submodule update --init --recursive`. Never edit files under it.

## Before you finish

Run `bun run typecheck`, `bun run lint`, and `bun run test`. If contracts were
touched, also run `bun run contracts:test`.
