# CLAUDE.md — contracts/

The Foundry project. Owned by Kiel.

- This is a plain Foundry workspace, not a bun workspace. It is invisible to
  Turborepo and Biome; run it with `forge` or through the root shortcuts
  `bun run contracts:build` and `bun run contracts:test`.
- `lib/` holds **git submodules** (`forge-std`, `openzeppelin-contracts`,
  `openzeppelin-contracts-upgradeable`, and their own nested submodules).
  Never edit anything under `lib/`, and never commit changes to it. Restore it
  with `git submodule update --init --recursive`. Add a dependency with
  `forge install <org>/<repo>` from this directory.
- `src/` holds contracts, `test/` holds `*.t.sol` tests, `script/` holds
  deployment scripts. `out/` and `cache/` are generated and gitignored.
- Target chain is Hedera testnet (EVM compatible), so Solidity and Foundry work
  as they do on any EVM chain.
- Contracts never sit in the x402 payment path (`payTo` must be a `0.0.x`
  account). The only planned contract is `PromptRegistry`: OpenZeppelin
  ERC-1155 licence + creator registry. Keep comments minimal.
- Never hardcode a private key or an RPC URL. Read them from the environment and
  document each new variable in the root `.env.example`.
- Run `forge test` before finishing any change here.

The default `Counter` contract is scaffolding from `forge init`; delete it once
real contracts land.
