# Claiming a name under bajigur.eth

The profile now has the surface. It calls two endpoints `apps/api` does not
have yet, and answers 501 until it does, so nothing is broken in the meantime.

Agreed with Kiel: the name is claimed from the profile, `apps/api` sends the
Sepolia transaction, and the user stays on Hedera and never needs Sepolia ETH.

## What the frontend calls

```
GET  /ens/available?label=axel      -> { available: boolean }
POST /ens/claim                     -> { name, hedera, transaction? }
     Authorization: Bearer <agent token>
     { "label": "axel" }
```

`GET /agent/me` should also report `ensName` once a wallet has one, so the
profile shows the name instead of the claim form.

## The trap: BajigurRegistrar cannot do this

```solidity
mapping(address owner => uint256 tokenId) public claimed;

function claim(string calldata label, address resolver) external returns (uint256 tokenId) {
    if (claimed[msg.sender] != 0) revert AlreadyClaimed(msg.sender);
    tokenId = REGISTRY.register(label, msg.sender, ...);
```

Called by the API, that registers the name to **the API's wallet**, not the
user's. Worse, `claimed[msg.sender]` means the API could claim exactly one name
ever, and every later user would revert with `AlreadyClaimed`.

Two ways out:

1. **Skip the registrar.** The platform wallet already holds `ROLE_REGISTRAR` on
   the subregistry, which `ens-setup.sh` uses to create `kiel.` and `agent.`.
   Call `IPermissionedRegistry.register(label, userAddress, ...)` directly and
   pass the user's EVM address as owner. No contract change.
2. **Add `claimFor(label, owner, resolver)`** to `BajigurRegistrar`, keyed on
   `owner` rather than `msg.sender`, and restricted to the API.

The first needs no redeploy. The second keeps one-name-per-wallet enforced
onchain, which the first gives up unless the API tracks it.

## Do not forget the text record

Registering the name is half of it. `payToOf()` resolves a creator's payout by
reading `bajigur.hedera` off their name, and falls back to the platform account
when it is missing. A name without that record means a creator whose buyers pay
Bajigur instead of them.

So `/ens/claim` has to set `bajigur.hedera` to the caller's Hedera account in
the same flow, the way `ens-setup.sh` does for the seed names.

## Validation

`src/lib/ens.ts` mirrors `isValidLabel` (3 to 32 characters of `[a-z0-9-]`, no
leading or trailing hyphen) so a bad label is refused before it costs a round
trip. That is a convenience, not the check: the contract still enforces it.
