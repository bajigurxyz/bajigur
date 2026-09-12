# Deploying

Four services, all live, each on its own subdomain of `bajigur.xyz`.

| Service | Where | Status |
| --- | --- | --- |
| `apps/api` | Railway | live, `api.bajigur.xyz` |
| `apps/mcp` | Railway | live, `mcp.bajigur.xyz` |
| `apps/landingpage` | Vercel | live, `bajigur.xyz` |
| `apps/web` | Vercel | live, `app.bajigur.xyz` |

## Vercel, one project per app

Connect each project to the GitHub repository and let pushes drive the builds.
**Do not deploy these with `vercel deploy` from the command line.** The CLI
uploads the directory it is run from, so the workspace root never arrives: npm
then meets `workspace:*` and fails with `EUNSUPPORTEDPROTOCOL`, or Vercel
reports that the configured Root Directory does not exist. Both were seen
before this was written down.

A push, by contrast, gives Vercel the whole repository. It finds `bun.lock` at
the root, installs there, and builds inside the Root Directory below.

In the project settings:

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
NEXT_PUBLIC_API_URL=https://api.bajigur.xyz
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
| `mcp` | CNAME | `mcp.bajigur.xyz` | new |
| `api` | CNAME | `api.bajigur.xyz` | new |

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
