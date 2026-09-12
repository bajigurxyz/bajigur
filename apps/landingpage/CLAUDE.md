@AGENTS.md

# CLAUDE.md — apps/landingpage

`@bajigur/landingpage`, the public marketing site. Owned by Axel. Port 3001.

Next.js 16 App Router · React 19 · Tailwind v4 · React Compiler.

**Provider-free by design.** No wallet, no sign-in, no authenticated call, no
`PrivyProvider`. Anything that needs an account belongs in `apps/web`, which is
a separate origin — link out to it through `NEXT_PUBLIC_APP_URL`, never with a
bare route. `Nav` and the hero CTA already do.

The UI came from Axel's Promit project. The visual design stayed; every fact in
the copy was rewritten for Bajigur, and the tests below are what keep it that
way.

## Hero

- `src/app/page.tsx` composes `Nav` and `Footer`. Nav owns the mobile-menu
  state; its overlay is a sibling of `<nav>` so it positions against the page's
  `relative` root, not the nav bar.
- The logo is `public/logo.png` (the locked mark from `docs/brand`) rendered
  through `next/image` with explicit dimensions and alt "Bajigur". It is a LINK
  home, so an empty alt is forbidden — that leaves screen readers with an
  unnamed link. The mark is dark; on a dark surface use the white variant,
  never black on black.
- Entrance choreography: staggered elements carry inline `opacity: 0` plus
  `animate-fade-in-up` / `animate-fade-in-overlay` from `globals.css`. The
  `prefers-reduced-motion` guard must SHORTEN the animation, never
  `animation: none` — cancelling it leaves the inline `opacity: 0` in force and
  reduced-motion users see a blank page. `reduced-motion.test.tsx` enforces
  this; any new staggered element must use a guarded class.
- Media lives under `public/media/`, referenced root-relative. Never hotlink a
  third-party host — `page.test.tsx` fails on any absolute or protocol-relative
  media URL. `public/media/hero.mp4` is 1280x724 H.264 CRF 28, muted,
  faststart, 185 KB; keep a replacement in that size class. Source footage
  arrives at 4K, which is a waste to decode behind text: scale it down first.

## Agent onboarding

`src/components/AgentOnboarding.tsx` is the conversion surface: one
copy-and-paste block per target, with the keyless path first because that is
the product's whole argument — a delegated Privy wallet pays, and `apps/api`
signs, so the user holds no key.

Every command comes from the repo and the live deployment. The MCP entry point
is `apps/mcp/src/index.ts`; the env names are the ones `apps/mcp` actually
reads; the API is the deployed one. `agent-onboarding.test.tsx` enforces the
honesty rules: no unpublished npm package presented as runnable, no local API
URL, a funding source named wherever a snippet asks for the user's own Hedera
key, and no host outside the repo, the live API, `portal.hedera.com`,
`faucet.circle.com`, and the app origin. **Run a command before writing it
down.**

The section is deliberately free of entrance stagger — it sits below the fold,
where time-based delays have already elapsed by the time anyone scrolls to it.

## MCP documentation

`src/app/mcp/page.tsx` is the page people are sent to when they hear Bajigur
has an MCP server: what the three tools are, how to connect, how signing in
works, and what happens when an agent spends money. It renders the same
`AgentOnboarding` the home page does, so the command cannot differ between them.

Every address comes from `NEXT_PUBLIC_MCP_URL` and `NEXT_PUBLIC_APP_URL`, never
written by hand. That is not style: the deployment has moved hosts twice, and a
hardcoded host survives the move and keeps pointing somewhere we left.
`src/app/mcp/page.test.tsx` enforces it, along with the tool list matching what
the server answers `tools/list` with.

## Tests

`bun run test` → `vitest run`, jsdom, `@` → `./src`. Vitest globals are off:
import from `vitest` and call `cleanup` in your own `afterEach`. Stick to
`fireEvent`; `@testing-library/user-event` is deliberately not installed.
`__tests__/helpers.ts` holds only the clipboard stub — the catalogue helpers
went to `apps/web` with the gallery.

## Verification gates

```
bun run typecheck && bun run lint && bun run test && bun run build
```
