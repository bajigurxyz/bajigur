# CLAUDE.md — packages/tsconfig

`@bajigur/tsconfig`, the shared TypeScript configuration.

| File | Extend it from |
| --- | --- |
| `base.json` | Bun services and anything without a DOM (`apps/api`) |
| `library.json` | Packages under `packages/*` |
| `app.json` | Non-Next.js apps that need DOM and JSX |

The Next.js apps keep their own generated `tsconfig.json` instead, because Next
requires specific `plugins`, `include`, and `moduleResolution` values. Do not
force them onto these presets.

Changing a flag here changes it for every consumer, so run `bun run typecheck`
at the repository root after any edit. Add a new preset only when an existing
one genuinely does not fit.
