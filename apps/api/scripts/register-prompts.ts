import {
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  PrivateKey,
} from "@hiero-ledger/sdk";
import { payToOf, prompts, tinybars } from "../src/prompts";

const address = process.env.PROMPT_REGISTRY_ADDRESS;
const operator = process.env.X402_PAY_TO_ADDRESS;
const key = process.env.X402_PAY_TO_KEY;
if (!address || !operator || !key) {
  console.error("set PROMPT_REGISTRY_ADDRESS, X402_PAY_TO_ADDRESS and X402_PAY_TO_KEY in .env");
  process.exit(1);
}

const client = Client.forName(process.env.HEDERA_NETWORK ?? "testnet").setOperator(
  AccountId.fromString(operator),
  PrivateKey.fromStringECDSA(key),
);
const contract = ContractId.fromEvmAddress(0, 0, address);
const usdc = (usd: string) => Number((Number(usd) * 1_000_000).toFixed(0));
const sha256 = (text: string) =>
  new Uint8Array(new Bun.CryptoHasher("sha256").update(text).digest());

for (const p of prompts) {
  if (p.registryId) {
    console.log(`${p.id}: already registered as #${p.registryId}`);
    continue;
  }
  const record = await new ContractExecuteTransaction()
    .setContractId(contract)
    .setGas(400_000)
    .setFunction(
      "register",
      new ContractFunctionParameters()
        .addBytes32(sha256(p.body))
        .addString(await payToOf(p))
        .addUint64(usdc(p.priceUsd))
        .addUint64(Number(tinybars(p.priceHbar)))
        .addString(`bajigur:${p.id}`),
    )
    .execute(client)
    .then((res) => res.getRecord(client));
  const id = record.contractFunctionResult?.getUint256(0).toString();
  console.log(`${p.id}: registered as #${id} (${record.transactionId.toString()})`);
}
client.close();
