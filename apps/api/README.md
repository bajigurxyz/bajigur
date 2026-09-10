# @bajigur/api

The Bajigur HTTP API and x402 payment gateway. Bun + Hono.

```bash
bun run dev --filter=@bajigur/api     # http://localhost:3002
curl http://localhost:3002/health
```

## Layout

```
src/app.ts     Hono app and routes (importable by tests)
src/index.ts   Bun server entry, port binding only
test/          bun:test suites
```

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | Listen port, defaults to `3002` |

Payment, Hedera, and Privy variables are listed in the root `.env.example` and
are not wired up yet.
