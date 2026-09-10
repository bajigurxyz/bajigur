# contracts

Foundry project for the Bajigur onchain components, targeting Hedera testnet.

## Setup

```bash
git submodule update --init --recursive
```

`lib/` is made of git submodules, so a fresh clone has no dependencies until
that command runs.

## Commands

```bash
forge build      # or: bun run contracts:build   (from the repo root)
forge test       # or: bun run contracts:test
forge fmt
```

## Layout

```
src/       contracts
test/      *.t.sol tests
script/    deployment scripts
lib/       git submodules (forge-std, OpenZeppelin)
```

`src/Counter.sol` and its test are `forge init` scaffolding and should be
removed once real contracts exist.
