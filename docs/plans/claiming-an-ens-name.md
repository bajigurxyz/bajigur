# Claiming a name under bajigur.eth

Status: shipped. `GET /ens/available` and `POST /ens/claim` in `apps/api`, with
the control on the profile page in `apps/web`.

The user stays on Hedera, never switches chain, and never needs Sepolia ETH. The
platform sends the transaction and pays the gas; the name belongs to the user.

## The routes

```
GET  /ens/available?label=axel   -> { available: true }
POST /ens/claim                  -> { name, hedera, transaction }
     Authorization: Bearer <agent token>
     { "label": "axel" }
```

`GET /agent/me` reports `ensName` once a wallet has one.

## Why the registrar needed a second entry point

`claim(label, resolver)` registers to `msg.sender`. Called by the API that would
be the API's own wallet, and `claimed[msg.sender]` would let the API claim
exactly one name ever. So `BajigurRegistrar` gained:

```solidity
function claimFor(string calldata label, address owner, string calldata hederaAccount)
    external returns (uint256 tokenId)
{
    if (msg.sender != OPERATOR) revert NotOperator(msg.sender);
    tokenId = _claim(label, owner, address(RESOLVER));
    RESOLVER.setText(node(label), HEDERA_KEY, hederaAccount);
}
```

One name per wallet moved from `claimed[msg.sender]` to `labelOf[owner]`, which
is the mapping the rule always meant. That mapping doubles as the address-to-name
index the buyer list and the reputation use.

## The record is not optional

`payToOf` resolves a creator's payout from the `bajigur.hedera` record on their
name. A name registered without that record is a creator whose buyers pay
Bajigur instead of them, so `claimFor` writes it in the same transaction as the
registration: if the record write reverts, the registration goes with it.

## Validation

`isValidLabel` is three to thirty-two characters of `[a-z0-9-]` with no leading
or trailing hyphen, enforced in `apps/api/src/ens.ts` before a transaction is
built and again in the contract. `apps/web/src/lib/ens.ts` mirrors it for the
form. `/ens/available` refuses an invalid label with 400 and reports a taken one
through the registry's own `getStatus`.

Deployed: `0x418b68e12e29901362174d36b6fda230e3250976` on Sepolia, verified.
