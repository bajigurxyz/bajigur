#!/usr/bin/env bash
# One-off ENSv2 (Sepolia) setup for bajigur.eth. Idempotent where the CLI reports alreadyDeployed/alreadySet.
# Needs: ens (npm i -g https://pkg.pr.new/ensdomains/ens-cli/@ensdomains/cli@main), cast, and in .env:
#   DEPLOYER_PRIVATE_KEY (platform EVM key), SEPOLIA_RPC_URL (optional)
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a

RPC="${SEPOLIA_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
OWNER=$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")
NAME="${ENS_NAME:-bajigur.eth}"
USDC=0x768F42455A2D082E23ceeF7d51e5787C82d67a39
REGISTRAR=0xa88553f454b77203b0d036a05c894d555eaaa2cc
E="ens --chain sepolia --rpc $RPC --format json"

send() { # send <label> <calldata-json>
  local to data value
  to=$(echo "$2" | python3 -c 'import json,sys; print(json.load(sys.stdin)["to"])')
  data=$(echo "$2" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"])')
  value=$(echo "$2" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value") or "0")')
  echo "-> $1"
  cast send "$to" "$data" --value "$value" --private-key "$DEPLOYER_PRIVATE_KEY" --rpc-url "$RPC" --json | python3 -c 'import json,sys; r=json.load(sys.stdin); print("   tx", r["transactionHash"], "status", r["status"])'
}

echo "owner $OWNER on sepolia, name $NAME"
echo "balance: $(cast balance "$OWNER" --rpc-url "$RPC" --ether) ETH"

echo "== 1. resolver"
RES=$($E resolver deploy "$OWNER")
RESOLVER=$(echo "$RES" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("resolver") or d.get("address"))')
if echo "$RES" | grep -q '"alreadyDeployed": *true'; then echo "   exists $RESOLVER"; else send "deploy resolver $RESOLVER" "$RES"; fi

echo "== 2. name $NAME"
if $E available "$NAME" | grep -q '"available": *true'; then
  cast send $USDC "mint(address,uint256)" "$OWNER" 100000000 --private-key "$DEPLOYER_PRIVATE_KEY" --rpc-url "$RPC" >/dev/null && echo "   minted 100 MockUSDC"
  cast send $USDC "approve(address,uint256)" $REGISTRAR 100000000 --private-key "$DEPLOYER_PRIVATE_KEY" --rpc-url "$RPC" >/dev/null && echo "   approved registrar"
  COMMIT=$($E register commit "$NAME" --owner "$OWNER" --resolver "$RESOLVER" --paymentToken $USDC)
  SECRET=$(echo "$COMMIT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["secret"])')
  send "commit" "$COMMIT"
  echo "   waiting 75s for the commitment to age"; sleep 75
  send "register" "$($E register reveal "$NAME" --owner "$OWNER" --resolver "$RESOLVER" --secret "$SECRET" --paymentToken $USDC)"
else
  echo "   already registered"
fi

echo "== 3. subregistry"
SUB=$($E subregistry deploy "$NAME" --deployer "$OWNER")
SUBREG=$(echo "$SUB" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("registry") or d.get("subregistry") or d.get("address"))')
if echo "$SUB" | grep -qE '"already(Set|Deployed)": *true'; then echo "   exists $SUBREG"; else
  send "deploy subregistry $SUBREG" "$SUB"
  send "attach subregistry" "$($E subregistry set "$NAME" --registry "$SUBREG")"
fi

echo "== 4. subnames + records"
subname() { # subname <label> <hedera-account> <role>
  local full="$1.$NAME"
  if $E whois "$full" 2>/dev/null | grep -q "$OWNER"; then echo "   $full exists"; else
    send "create $full" "$($E subname create "$full" --owner "$OWNER" --resolver "$RESOLVER")"
  fi
  send "$full bajigur.hedera=$2" "$($E set text "$full" --key bajigur.hedera --value "$2" --resolver "$RESOLVER")"
  send "$full bajigur.role=$3" "$($E set text "$full" --key bajigur.role --value "$3" --resolver "$RESOLVER")"
}
subname kiel "$X402_PAY_TO_ADDRESS" creator
subname agent "$HEDERA_OPERATOR_ID" agent

echo "== done"
echo "ENS_NAME=$NAME"
echo "ENS_RESOLVER=$RESOLVER"
echo "ENS_SUBREGISTRY=$SUBREG"
