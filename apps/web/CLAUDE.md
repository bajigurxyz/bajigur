@AGENTS.md

# CLAUDE.md — apps/web

`@bajigur/web`, the main application. Owned by Axel.

- Next.js 16 App Router, React 19, Tailwind CSS v4, React Compiler enabled.
- Dev server runs on port 3000: `bun run dev --filter=@bajigur/web`.
- `@/*` resolves to `src/*`. Shared logic comes from `@bajigur/core`.
- Talks to `apps/api` over `NEXT_PUBLIC_API_URL`. Never reach into another app's
  source directly.
- Only `NEXT_PUBLIC_*` variables are safe in client components. Secrets stay in
  `apps/api`.
- `bun run typecheck` runs `next typegen` first, because Next 16 generates the
  `LayoutProps` and `PageProps` types this app relies on.
- Biome formats the code; ESLint (`bun run lint`) enforces the Next.js rules.
