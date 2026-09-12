# Deploying

Four services. Two already run on Railway; the two Next apps are not deployed
yet, which is why the MCP server still advertises `http://localhost:3000` as its
authorization server and why OAuth cannot work for anyone but us.

| Service | Where | Status |
| --- | --- | --- |
| `apps/api` | Railway | live, `api-production-fe21.up.railway.app` |
| `apps/mcp` | Railway | live, `mcp-production-bbfe.up.railway.app` |
| `apps/landingpage` | Vercel | not deployed |
| `apps/web` | Vercel | not deployed |

## Vercel, one project per app

This is a bun workspace, so each project points at its own directory and Vercel
installs from the repository root. In the project settings:

| Setting | `apps/landingpage` | `apps/web` |
| --- | --- | --- |
| Root Directory | `apps/landingpage` | `apps/web` |
| Framework | Next.js | Next.js |
| Install / Build | leave as detected | leave as detected |

`bun.lock` is at the root, so Vercel picks bun on its own.

**Set the environment variables before the first build.** Everything named
`NEXT_PUBLIC_*` is inlined at build time, so a variable added afterwards does
nothing until the next deploy.

`apps/landingpage`:

```
NEXT_PUBLIC_APP_URL=https://app.bajigur.xyz
```

`apps/web`:

```
NEXT_PUBLIC_API_URL=https://api-production-fe21.up.railway.app
NEXT_PUBLIC_LANDING_URL=https://bajigur.xyz
NEXT_PUBLIC_PRIVY_APP_ID=<the app id the API also uses>
NEXT_PUBLIC_PRIVY_SIGNER_ID=<key quorum id>
NEXT_PUBLIC_ENS_NAME=bajigur.eth
```

The Privy app id has to be the same one `apps/api` verifies against. A mismatch
is exactly what made every sign-in fail with "Failed to verify authentication
token".

## DNS at Hostinger

Keep Hostinger's nameservers and edit records there.

| Host | Type | Points at | Replaces |
| --- | --- | --- | --- |
| `@` | A | the apex IP Vercel shows you | the existing `A @ 2.57.91.91` parking record |
| `www` | CNAME | `cname.vercel-dns.com` | the existing `CNAME www bajigur.xyz` |
| `app` | CNAME | `cname.vercel-dns.com` | new |
| `mcp` | CNAME | `mcp-production-bbfe.up.railway.app` | new |
| `api` | CNAME | `api-production-fe21.up.railway.app` | new |

**Do not copy an apex IP from anywhere, including this file.** Add the domain in
the Vercel dashboard first and use the record it prints. Vercel has changed that
address before, and a stale one points the domain at nothing.

Railway issues its own certificate once the CNAME resolves, so `mcp` and `api`
need the custom domain added on the Railway side too.

## After the domains resolve

Set on the Railway `mcp` service and redeploy:

```
BAJIGUR_APP_URL=https://app.bajigur.xyz
```

Until then `/.well-known/oauth-protected-resource` names `http://localhost:3000`
as the authorization server, so any MCP client that tries to log in is sent to
its own machine and finds nothing.
