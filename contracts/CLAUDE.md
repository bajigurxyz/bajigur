# CLAUDE.md — contracts/

The Foundry project. Owned by Kiel.

- This is a plain Foundry workspace, not a bun workspace. It is invisible to
  Turborepo and Biome; run it with `forge` or through the root shortcuts
  `bun run contracts:build` and `bun run contracts:test`.
- `lib/` holds **git submodules** (`forge-std`, `openzeppelin-contracts`,
  `openzeppelin-contracts-upgradeable`, `contracts-v2` from ENS, and their own
  nested submodules). `remappings.txt` pins the four import prefixes; keep it
  in sync when adding a dependency.
  Never edit anything under `lib/`, and never commit changes to it. Restore it
  with `git submodule update --init --recursive`. Add a dependency with
  `forge install <org>/<repo>` from this directory.
- `src/` holds contracts, `test/` holds `*.t.sol` tests, `script/` holds
  deployment scripts. `out/` and `cache/` are generated and gitignored.
- Target chain is Hedera testnet (EVM compatible), so Solidity and Foundry work
  as they do on any EVM chain.
- Contracts never sit in the x402 payment path (`payTo` must be a `0.0.x`
  account). Two contracts: `src/PromptRegistry.sol` (Hedera, OpenZeppelin
  ERC-1155 + AccessControl) and `src/BajigurRegistrar.sol` (Sepolia, ENSv2). Creators `register` / `update` their prompt
  (content hash, Hedera `payTo`, USDC and tinybar prices, uri); `MINTER_ROLE`
  (the API) calls `issue` after an x402 settlement to mint one licence per
  buyer, with the Hedera transaction id in the event. Keep comments minimal.
- `BajigurRegistrar` sits in front of bajigur.eth's ENSv2 subregistry
  (`ENS_SUBREGISTRY`) and holds `ROLE_REGISTRAR` on its root resource. Anyone
  claims one free `<label>.bajigur.eth` (3-32 chars `[a-z0-9-]`, 10 years) with
  a resolver they control; the owner gets the tutorial's registration roles,
  not registrar roles. `script/DeployRegistrar.s.sol` deploys and grants the
  role; `script/ClaimName.s.sol` claims from `CLAIM_PRIVATE_KEY`. The fork test
  in `test/BajigurRegistrar.t.sol` runs only with `SEPOLIA_RPC_URL`; never use
  `makeAddr` accounts as token receivers on Sepolia, their public keys carry
  EIP-7702 code.
- `foundry.toml` pins solc 0.8.28 and `evm_version = "cancun"`; OpenZeppelin
  5.7 needs `mcopy`, and Hedera has supported Cancun since mainnet 0.50.
- Deploy with `script/Deploy.s.sol`: reads `DEPLOYER_PRIVATE_KEY` and optional
  `PROMPT_MINTER` (defaults to the deployer), RPC from `HEDERA_TESTNET_RPC_URL`
  via the `hedera_testnet` alias. Verify with `forge verify-contract` against
  `--verifier sourcify --verifier-url https://sourcify.dev/server` (see README);
  HashScan shows the source once Sourcify has an exact match.
- Never hardcode a private key or an RPC URL. Read them from the environment and
  document each new variable in the root `.env.example`.
- Run `forge test` before finishing any change here.
