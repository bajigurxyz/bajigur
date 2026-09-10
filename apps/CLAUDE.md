# CLAUDE.md — apps/

Every directory here is a deployable unit and a bun workspace named
`@bajigur/<dir>`. Read the `CLAUDE.md` inside the specific app before editing it.

| App | Stack | Port | Owner | Status |
| --- | --- | --- | --- | --- |
| `web` | Next.js 16, React 19, Tailwind v4 | 3000 | Axel | active |
| `landingpage` | Next.js 16, React 19, Tailwind v4 | 3001 | Axel | active |
| `api` | Bun + Hono, x402 v2 on Hedera | 3002 | Kiel | active |
| `ai` | undecided | — | unassigned | placeholder |
| `indexer` | undecided | — | unassigned | placeholder |
| `mcp` | undecided | — | Kiel | planned, after `api` |

Rules:

- Apps never import from each other. Anything shared belongs in `packages/core`.
- Every app that ships code must expose `dev`, `build`, `test`, `typecheck`, and
  `clean` scripts so Turborepo can drive it.
- Placeholder apps carry only a `package.json`, `README.md`, and `CLAUDE.md`.
  Do not scaffold them out unless the task explicitly asks for it.
