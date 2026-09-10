# @bajigur/web

The main Bajigur application: browsing the prompt library, connecting a wallet,
paying over x402, and using an unlocked prompt.

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · React Compiler.

```bash
bun run dev --filter=@bajigur/web     # http://localhost:3000
```

Environment: `NEXT_PUBLIC_API_URL` points at `apps/api`. See the root
`.env.example`.
