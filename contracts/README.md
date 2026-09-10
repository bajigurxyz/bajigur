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

`src/PromptRegistry.sol` is the creator registry plus ERC-1155 licence. Deploy:

```bash
forge script script/Deploy.s.sol --rpc-url hedera_testnet --broadcast
```

Verify on HashScan (it reads from Sourcify; the old `server-verify.hashscan.io`
now redirects there):

```bash
forge verify-contract <address> src/PromptRegistry.sol:PromptRegistry \
  --chain-id 296 --verifier sourcify --verifier-url https://sourcify.dev/server \
  --constructor-args $(cast abi-encode "constructor(address,address)" <admin> <minter>)
```

## Deployments

| Network | Contract | Address | Admin / minter | Source |
| --- | --- | --- | --- | --- |
| Hedera testnet | `PromptRegistry` | [`0x59de4C018968E0357EeF77042dD2Fc2ff33e1418`](https://hashscan.io/testnet/contract/0x59de4C018968E0357EeF77042dD2Fc2ff33e1418) (`0.0.10462346`) | `0xE610b819dd190Fc8154d0190BB3F3e9758d42bAa` | verified, exact match |

## ERC-8004

`script/RegisterAgent.s.sol` registers the Bajigur service on the ERC-8004
IdentityRegistry (`0x8004A818BFB912233c491871b3d84c89A494BD9e` on Hedera
testnet) with `ERC8004_AGENT_URI` pointing at the API's
`/.well-known/agent.json`. Registered as agent **111**, owned by the platform
account.

```bash
ERC8004_AGENT_URI=https://api-production-fe21.up.railway.app/.well-known/agent.json \
  forge script script/RegisterAgent.s.sol --rpc-url hedera_testnet --broadcast
```

