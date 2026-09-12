# Verify it yourself

Every claim in the README, checked against the two public testnets with nothing
but `curl` and `jq`. No key, no account, no trust in us. Copy, paste, read the
answer.

Two helpers used throughout:

```bash
API=https://api.bajigur.xyz
HEDERA=https://testnet.mirrornode.hedera.com/api/v1
SEPOLIA=https://ethereum-sepolia-rpc.publicnode.com

# a read-only call to a contract on Hedera, through the public mirror node
hcall() { curl -s "$HEDERA/contracts/call" -H 'content-type: application/json' \
  -d "{\"to\":\"$1\",\"data\":\"$2\"}" | jq -r .result; }

# a read-only call to a contract on Sepolia
ecall() { curl -s "$SEPOLIA" -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$1\",\"data\":\"$2\"},\"latest\"]}" \
  | jq -r .result; }

# decode an ABI-encoded string return value
str() { python3 -c "import sys;d=bytes.fromhex(sys.stdin.read().strip()[2:]);n=int.from_bytes(d[32:64],'big');print(d[64:64+n].decode())"; }
```

## 1. The service really is x402-gated

```bash
curl -sD- -o/dev/null $API/prompts/nova-ai-cinematic-landing/unlock \
  | grep -i payment-required | cut -d' ' -f2 | base64 -d | jq '.accepts'
```

Two ways to pay for the same resource, both on `hedera:testnet`: USDC token
`0.0.429274` and HBAR as asset `0.0.0`, each with the creator's `payTo` and the
facilitator's `extra.feePayer`. The response status is `402`.

The same catalogue is published for agents to find on their own:

```bash
curl -s $API/discovery/resources | jq '.items[].resource'
```

## 2. `payTo` comes from ENS, not from our database

The 402 above says `payTo` is `0.0.7275085`. That number is not stored in the
API. It is a text record on `kiel.bajigur.eth`, read live from ENSv2 on Sepolia:

```bash
ecall 0x7f381419050525025bBB6811CF5821E0615487f6 \
  0x59d1d43cd8ba522f922832f0853fff9dabd2faeba8087f1c28e8dae5c4326257196d6e3b0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000e62616a696775722e686564657261000000000000000000000000000000000000 \
  | str
```

That is `text(namehash("kiel.bajigur.eth"), "bajigur.hedera")` on our resolver.
Change the record and the next 402 quotes the new account; nothing is redeployed.

## 3. A user owns the name they claimed, not us

`claude.bajigur.eth` was claimed through the API by a wallet that has never held
Sepolia ETH. Ask the subregistry who owns that label:

```bash
ecall 0x9673702a3C850fa1c41d94C908083Fc85F59461c \
  0xc41a360a5f1c28741ee74be2a828fd337283ca47e477a0cd56bf5ad31c61e1ce3ce1d22f
```

The answer is `0x…d601ac178dc416ac352a96d0efcb1de44349ed1b`, the user's own Privy
wallet. The platform paid the gas and kept nothing. The registration and the
payout record were written in
[one Sepolia transaction](https://sepolia.etherscan.io/tx/0xda2fd533ee092a1719a612d7ef3ea8aa6e4781598389453808030a8f3a952531),
so a claimed name can never exist without the record that says where its money
goes.

## 4. A purchase really settles on Hedera, to the creator

Open any proof transaction from the README on HashScan, for example
[0.0.7162784@1789206663](https://hashscan.io/testnet/transaction/0.0.7162784-1789206663-898896205).
The transfer list shows USDC leaving the buyer and arriving at the creator's
account, with Blocky402 as fee payer. We are not in the middle of it.

## 5. The licence is an ERC-1155 the buyer holds

`balanceOf(buyer, promptId)` on `PromptRegistry`, Hedera testnet:

```bash
hcall 0x59de4C018968E0357EeF77042dD2Fc2ff33e1418 \
  0x00fdd58e000000000000000000000000d601ac178dc416ac352a96d0efcb1de44349ed1b0000000000000000000000000000000000000000000000000000000000000005
```

`0x…01` means that wallet holds the licence for prompt 5, which is why the API
serves that prompt to it without a 402. The same answer, by name:

```bash
curl -s $API/licenses/claude.bajigur.eth | jq '.[].id'
```

## 6. Every settlement is written to HCS

```bash
curl -s "$HEDERA/topics/0.0.10462113/messages?order=desc&limit=3" \
  | jq -r '.messages[].message' | base64 -d | jq .
```

One JSON record per settlement, and one per rating, on a Hedera Consensus
Service topic we do not control the history of.

## 7. Reputation is ERC-8004, on Hedera, keyed by the ENS name

The two registries are deployed on Hedera testnet as singletons, and the
reputation one points at the identity one:

```bash
hcall 0x8004B663056A597Dffe9eCcC1965A193B7388713 0xbc4d861b   # getIdentityRegistry()
```

The creator's ENS name carries their agent id:

```bash
ecall 0x7f381419050525025bBB6811CF5821E0615487f6 \
  0x59d1d43cd8ba522f922832f0853fff9dabd2faeba8087f1c28e8dae5c4326257196d6e3b000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000076572633830303400000000000000000000000000000000000000000000000000 \
  | str
```

That prints `eip155:296:0x8004A818BFB912233c491871b3d84c89A494BD9e:115`. The
agent points back at the name, and at the card describing it:

```bash
hcall 0x8004A818BFB912233c491871b3d84c89A494BD9e \
  0xcb4799f2000000000000000000000000000000000000000000000000000000000000007300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003656e730000000000000000000000000000000000000000000000000000000000 \
  | str      # getMetadata(115, "ens")  -> kiel.bajigur.eth

hcall 0x8004A818BFB912233c491871b3d84c89A494BD9e \
  0xc87b56dd0000000000000000000000000000000000000000000000000000000000000073 \
  | str      # tokenURI(115) -> https://api.bajigur.xyz/creators/kiel.bajigur.eth/agent.json
```

And the rating itself is onchain, from the buyer's own wallet:

```bash
hcall 0x8004B663056A597Dffe9eCcC1965A193B7388713 \
  0x42dd519c0000000000000000000000000000000000000000000000000000000000000073   # getClients(115)
```

The address in that array is the buyer, not us. The registry refuses feedback
from an agent's own owner, so a creator cannot rate themselves and neither can
the platform. The transaction is
[0.0.10497977@1789213244](https://hashscan.io/testnet/transaction/0.0.10497977-1789213244-887394093),
signed and paid by that buyer's Privy wallet.

Read the whole thing as one page:

```bash
curl -s $API/creators/kiel.bajigur.eth | jq '{agent, reputation, feedback}'
```

## 8. Only a buyer can rate, and never themselves

```bash
curl -s -o/dev/null -w '%{http_code}\n' -X POST \
  $API/creators/kiel.bajigur.eth/feedback -H 'content-type: application/json' -d '{"like":true}'
```

`401` without a token. With a token for a wallet that holds no licence it is
`403 buy the prompt before rating it`, and for the creator's own wallet it is
`403 you cannot rate yourself`.

## 9. The contracts are verified source

- `PromptRegistry` on [HashScan](https://hashscan.io/testnet/contract/0x59de4C018968E0357EeF77042dD2Fc2ff33e1418), verified through Sourcify, exact match.
- `BajigurRegistrar` on [Etherscan](https://sepolia.etherscan.io/address/0x418b68e12e29901362174d36b6fda230e3250976#code), verified, exact match.
- Source in [`contracts/src`](../contracts/src), tests in [`contracts/test`](../contracts/test), including a fork test that claims a name against the real subregistry.

## 10. An agent can use it with no human in the loop

Paste `https://mcp.bajigur.xyz/mcp` into an MCP client and ask for a prompt. Or,
from a checkout of this repository with a Hedera testnet key in `.env`:

```bash
bun run buy nova-ai-cinematic-landing            # pays in USDC
X402_PAY_WITH=hbar bun run buy core-features-tabs  # pays in HBAR
```

The command prints the prompt body and the Hedera transaction id that paid for
it. Run it twice: the second run is free, because the licence from the first is
already in the wallet.
