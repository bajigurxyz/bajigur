# CLAUDE.md — packages/

Internal, private, never-published libraries consumed by `apps/*` through their
workspace name.

| Package | Purpose |
| --- | --- |
| `@bajigur/core` | Shared types and utilities |
| `@bajigur/tsconfig` | Base / app / library TypeScript configs |

Rules:

- Packages must not depend on any app, and must not import Next.js.
- Source is consumed directly from `src/` via the `exports` field; there is no
  build step. Keep everything runnable by both Bun and the Next.js bundler.
- Add a dependency here only when at least two workspaces need it.
