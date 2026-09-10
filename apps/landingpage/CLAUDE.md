@AGENTS.md

# CLAUDE.md — apps/landingpage

`@bajigur/landingpage`, the public marketing site. Owned by Axel.

- Next.js 16 App Router, React 19, Tailwind CSS v4, React Compiler enabled.
- Dev server runs on port 3001: `bun run dev --filter=@bajigur/landingpage`.
- Keep it static and fast: no authentication, no wallet connection, no writes.
  Anything interactive belongs in `apps/web`.
- `@/*` resolves to `src/*`. Shared logic comes from `@bajigur/core`.
- `bun run typecheck` runs `next typegen` first, because Next 16 generates the
  `LayoutProps` and `PageProps` types this app relies on.
