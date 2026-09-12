# Publishing a prompt

Status: shipped. `POST /prompts` in `apps/api`, with the form in `apps/web`.
This records how it works and which rules are enforced where.

## The route

```
POST /prompts
     Authorization: Bearer <agent token>
     { title, preview, body, tags[], priceUsd, priceHbar, previewMedia? }
  -> 201 { id, registryId, payTo, creator, transaction }
```

`DELETE /prompts/:id` unpublishes, creator only. Seeds cannot be removed.

## Where the body lives

Postgres on Railway (`DATABASE_URL`), one table, created on first use. The body
is the product: it has to survive a deploy, and it is never returned without a
licence. The two seed prompts stay in the bundle as `apps/api/src/catalog/*.md`.

`prompts` in `apps/api/src/prompts.ts` is still the array every other part of the
API reads. A middleware in `createApp` refreshes it from the store at most every
30 seconds, which keeps `findPrompt` synchronous and lets a second instance pick
up a new prompt without a restart.

## Rules the frontend cannot be trusted with

| Rule | Why |
| --- | --- |
| `payTo` is `claims.acct` from the token | Accepting it from the body is how someone publishes a prompt that pays them for another creator's work |
| `creator` is the wallet's ENS name, from `BajigurRegistrar.labelOf` | Same reason, and it is what the reputation hangs off |
| A prompt carrying its own `payTo` never inherits the platform's creator name | `payToOf` resolves a creator name to its own account, so inheriting it would route a published creator's income to us |
| Prices are decimal strings with bounded places | `0.1` as a float is not representable, and a payment one atomic unit off is refused |
| `previewMedia` must be https and end in a type a browser shows | It is rendered in an `<img>` in every visitor's browser; the host is the creator's own choice |
| Five prompts per wallet per hour | Each call mints an onchain registration whose gas we pay |

## Onchain

`PromptRegistry.register(contentHash, payTo, priceUsdc, priceTinybar, uri)` with
`contentHash = sha256(body)` and `uri` set to the preview media. `msg.sender` is
the platform wallet, so the onchain creator is us while `payTo` is the creator;
that is a deliberate trade, written down in `apps/api/src/registry.ts`, and
`payTo` is what actually receives money.

## Not built

Editing a published prompt. `PromptRegistry.update` exists and is creator-gated,
so it is the natural next step.
