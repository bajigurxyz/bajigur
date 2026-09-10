# Bajigur

A pay-per-use marketplace of motion/web design prompts, built so an AI agent
can discover, pay for, and use a prompt on its own. Payments are **x402 v2** on
**Hedera** through the **Blocky402** facilitator, paid straight to each
prompt's creator. Agents reach it through an **MCP server** and **Bazantic**;
buyers keep an onchain licence in their **Privy** wallet.

Built for [ETHGlobal ETHOnline 2026](https://ethglobal.com/events/ethonline2026)
targeting the **Hedera**, **Bazantic**, and **Privy** tracks. Design:
[`docs/superpowers/specs/2026-09-10-bajigur-product-design.md`](docs/superpowers/specs/2026-09-10-bajigur-product-design.md).

## Layout

```
.
├── apps/
│   ├── web/           # Next.js 16 — main application       (:3000)
│   ├── landingpage/   # Next.js 16 — marketing site         (:3001)
│   ├── api/           # Bun + Hono — HTTP API, x402 gateway (:3002)
│   ├── ai/            # placeholder — AI generation / agent service
│   ├── indexer/       # placeholder — onchain indexer
│   └── mcp/           # MCP server for Claude Desktop, x402 client
├── packages/
│   ├── core/          # @bajigur/core — shared types and utilities
│   └── tsconfig/      # @bajigur/tsconfig — base / app / library TS configs
├── contracts/         # Foundry (forge-std and OpenZeppelin as submodules)
├── skills/            # placeholder — Claude Agent Skills
├── biome.json         # formatter and linter for all TypeScript/JavaScript
└── turbo.json         # build / dev / test / typecheck pipeline
```

`apps/ai`, `apps/indexer`, and `skills/` currently contain only a README
describing what they are for.

## Getting started

```bash
git submodule update --init --recursive   # restore contracts/lib
bun install
cp .env.example .env
bun run dev
```

Requires [Bun](https://bun.sh) >= 1.3 and, for the contracts,
[Foundry](https://getfoundry.sh).

## Commands

| Command | Effect |
| --- | --- |
| `bun run dev` | Start every app at once |
| `bun run dev --filter=@bajigur/web` | Start a single app |
| `bun run build` | Build every app |
| `bun run test` | Run every workspace test suite |
| `bun run typecheck` | `tsc --noEmit` across the workspace |
| `bun run lint` | Biome check plus per-app ESLint |
| `bun run format` | Biome autofix and import sorting |
| `bun run contracts:build` | `forge build` inside `contracts/` |
| `bun run contracts:test` | `forge test` inside `contracts/` |

## Team

| Person | Owns |
| --- | --- |
| Axel | Frontend — `apps/web`, `apps/landingpage` |
| Kiel | Smart contracts and backend — `contracts/`, `apps/api`, `apps/mcp` |

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org):
`feat(api): add x402 payment middleware`. Everything in this repository —
code, comments, docs, and commit messages — is written in English.
