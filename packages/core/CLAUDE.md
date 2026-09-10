# CLAUDE.md — packages/core

`@bajigur/core`, the shared library every app may import.

- Consumed straight from source via `exports: { ".": "./src/index.ts" }`. There
  is no build step, so the code must run unchanged under Bun and inside the
  Next.js bundler.
- Keep it runtime-agnostic: no `node:` built-ins, no DOM APIs, no Next.js, no
  server-only SDKs. Anything platform-specific belongs in the app that needs it.
- No dependencies unless at least two workspaces need the same one.
- Everything is re-exported from `src/index.ts`; deep imports are not supported.
- Tests use `bun:test` and live in `test/`. Run them with
  `bun run test --filter=@bajigur/core`.
