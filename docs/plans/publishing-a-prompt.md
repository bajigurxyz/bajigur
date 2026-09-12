# Publishing a prompt

Status: not built. This records what a Publish button would need, what already
exists, and the one decision that blocks it.

## What already exists

| Piece | Where | State |
| --- | --- | --- |
| Onchain listing | `PromptRegistry.register(contentHash, payTo, priceUsdc, priceTinybar, uri)` on Hedera | Deployed, `0x59de…1418`. `msg.sender` becomes the creator and may later `update()` price and payout. |
| Creator identity | `BajigurRegistrar.claim(label, resolver)` on Sepolia | Deployed, `0x1eb7…9756`. One free `<name>.bajigur.eth` per wallet. |
| Payout routing | `payToOf()` in `apps/api/src/prompts.ts` | Reads the creator's `bajigur.hedera` text record at 402 time, so changing the record changes where money goes. |
| Payment and licence | x402 plus `PromptRegistry.issue()` | Working end to end. |

## What is missing

**The API cannot accept a prompt.** Every route in `apps/api/src/app.ts` is a
`GET` except `/agent/link` and `/agent/sign`. The catalogue is a hardcoded array
whose bodies are read from `src/catalog/*.md` at runtime, with the note "move to
a DB when creators publish from the web app". So a creator can register a
listing onchain today, and the prompt body would have nowhere to live.

Also missing: somewhere to put `previewMedia` (today those are URLs in a bucket
Kiel controls), and any notion of who may edit a listing after the fact.

## The decision that blocks it

Where do prompt bodies live once they are not in the repo?

- **A database.** Correct, and the only option that survives a redeploy. Costs a
  service and a schema.
- **Onchain only.** `register()` takes a `contentHash` and a `uri`. Bodies could
  go to IPFS or the existing bucket, with the contract as the index. No database,
  but uploads still need somewhere to accept them.
- **In memory.** Publishing works in a demo and every listing disappears on the
  next deploy, while the onchain registration survives. That mismatch is worse
  than not shipping the button.

This is Kiel's call: it is his service and his storage.

## Proposed flow, once storage exists

1. **Claim a name.** A creator needs `<name>.bajigur.eth` with `bajigur.hedera`
   set to their Hedera account, or payouts fall back to the platform account.
   Needs Sepolia ETH for gas, which is a separate faucet from everything else
   in this project.
2. **Write the prompt.** Title, tags, preview line, body, price in USDC and
   HBAR, optional preview recording.
3. **Register onchain.** `register()` from the creator's own wallet on Hedera,
   which returns the `registryId` the API needs for licences.
4. **Store the body.** `POST /prompts` with the registry id, authenticated by
   the same agent token the app already issues.
5. It appears under Published on `/my-prompts`, which already derives ownership
   from `payTo` and needs no change.

## Frontend, when unblocked

A form at `/publish`, reachable from the empty state under Published. The parts
that need care:

- The body is what is being sold, so it must never reach the catalogue
  response. The existing `Prompt` type in `apps/web/src/lib/api.ts` has no
  `body` field on purpose; keep it that way.
- `register()` is a Hedera transaction from the user's wallet, so it needs the
  same delegated signing path `/api/unlock` uses, not a browser wallet.
- Price is quoted in both USDC and HBAR and the contract stores both. Ask for
  one and derive the other, or the two drift.
