# CLAUDE.md

Guidance for Claude Code when working in this repository. Every directory that
holds real work has its own `CLAUDE.md` with the rules for that area — read the
local one before touching files there.

## Project

Bajigur is a pay-per-use library of motion/web design prompts (in the spirit of
[motionsites.ai](https://motionsites.ai)) gated by **x402**, and exposed to AI
agents through an **MCP server** plus **Claude Agent Skills** so a developer can
discover, pay for, and use a prompt directly from Claude Desktop.

Built for **ETHGlobal ETHOnline 2026**. Targeted prize tracks:

| Track | What has to ship |
| --- | --- |
| **Hedera** — AI & Agentic Payments ($6,000) | A live x402-gated service on Hedera testnet/mainnet settled through the Blocky402 facilitator, plus a platform or agent that completes at least one real paid request end to end. |
| **Bazantic** — Recipes ($3,000) | An x402/MPP Gateway on bazantic.com for our API, plus Recipes describing when, why, and how an agent should use it. |
| **Privy** ($5,000) | Privy wallets as the auth and funding layer behind at least one complete financial flow. |

Every track needs a public repo, a README, and a demo video. Hedera and Bazantic
also require the paid request to be demonstrated on camera.

> The product statement above is the current working direction, not a frozen
> spec. Confirm with the team before treating any of it as a hard requirement.

## Team

| Person | Owns |
| --- | --- |
| Axel (`Lexirieru`) | Frontend — `apps/web`, `apps/landingpage` |
| Kiel | Smart contracts and backend — `contracts/`, `apps/api` |

`apps/ai`, `apps/indexer`, `apps/mcp`, and `skills/` are placeholders. They hold
a README describing intent and nothing else. Do not build them out unless asked.

## Layout

```
apps/
  web/           Next.js 16 — main application            (:3000)
  landingpage/   Next.js 16 — marketing site              (:3001)
  api/           Bun + Hono — HTTP API, x402 gateway      (:3002)
  ai/            placeholder — AI generation / agent service
  indexer/       placeholder — onchain indexer
  mcp/           placeholder — MCP server for Claude Desktop
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
