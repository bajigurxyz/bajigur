import {
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  PrivateKey,
  PublicKey,
} from "@hiero-ledger/sdk";
import { decodeAbiParameters, keccak256, toBytes } from "viem";

export type Buyer = { address: string; transactionId: string; at: string };

export type Registration = {
  contentHash: Uint8Array;
  payTo: string;
  priceUsdc: number;
  priceTinybar: number;
  uri: string;
};

export type Registry = {
  register(input: Registration): Promise<{ id: number; transactionId: string }>;
  issue(registryId: number, payerAccount: string, transactionId: string): Promise<void>;
  hasLicence(account: string, registryId: number): Promise<boolean>;
  buyers(registryId: number): Promise<Buyer[]>;
  accountOf(address: string): Promise<string | undefined>;
  evmOf(account: string): Promise<string | undefined>;
};

export type Identity = (headers: Headers) => Promise<string | undefined>;

const network = () => process.env.HEDERA_NETWORK ?? "testnet";
const mirror = () => `https://${network()}.mirrornode.hedera.com/api/v1`;
const BALANCE_OF = "0x00fdd58e";
const LICENSE_ISSUED = keccak256(toBytes("LicenseIssued(uint256,address,string)"));
// Consensus timestamps are `seconds.nanos`.
const isoOf = (timestamp: string) => new Date(Number(timestamp.split(".")[0]) * 1000).toISOString();
const pad = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");

async function account(id: string) {
  const res = await fetch(`${mirror()}/accounts/${id}`);
  if (!res.ok) throw new Error(`unknown Hedera account ${id}`);
  return (await res.json()) as { evm_address: string; key: { _type: string; key: string } };
}

export function contractRegistry(): Registry | undefined {
  const address = process.env.PROMPT_REGISTRY_ADDRESS;
  const operator = process.env.X402_PAY_TO_ADDRESS;
  const key = process.env.X402_PAY_TO_KEY;
  if (!address || !operator || !key) {
    console.warn(
      "licences disabled: set PROMPT_REGISTRY_ADDRESS, X402_PAY_TO_ADDRESS and X402_PAY_TO_KEY",
    );
    return undefined;
  }
  const contract = ContractId.fromEvmAddress(0, 0, address);
  const client = Client.forName(network()).setOperator(
    AccountId.fromString(operator),
    PrivateKey.fromStringECDSA(key),
  );

  return {
    // ponytail: the mirror node only filters by topic inside a 7-day window, so read this
    // contract's log and filter here. Revisit past a few hundred licences.
    async buyers(registryId) {
      const res = await fetch(`${mirror()}/contracts/${address}/results/logs?order=asc&limit=100`);
      if (!res.ok) return [];
      const { logs = [] } = (await res.json()) as {
        logs?: { topics: string[]; data: string; timestamp: string }[];
      };
      return logs
        .filter(
          (log) =>
            log.topics[0]?.toLowerCase() === LICENSE_ISSUED &&
            log.topics[1] !== undefined &&
            BigInt(log.topics[1]) === BigInt(registryId),
        )
        .map((log) => ({
          address: `0x${(log.topics[2] ?? "").slice(-40)}`,
          transactionId: decodeAbiParameters([{ type: "string" }], log.data as `0x${string}`)[0],
          at: isoOf(log.timestamp),
        }));
    },

    async evmOf(accountId) {
      return account(accountId)
        .then((a) => a.evm_address)
        .catch(() => undefined);
    },

    async accountOf(evmAddress) {
      const res = await fetch(`${mirror()}/accounts/${evmAddress}`);
      if (!res.ok) return undefined;
      return ((await res.json()) as { account?: string }).account;
    },

    // msg.sender is the platform wallet, so the onchain creator is us; payTo is the
    // creator's own account and payTo is what receives the money. Deliberate, not an accident.
    async register({ contentHash, payTo, priceUsdc, priceTinybar, uri }) {
      const record = await new ContractExecuteTransaction()
        .setContractId(contract)
        .setGas(600_000)
        .setFunction(
          "register",
          new ContractFunctionParameters()
            .addBytes32(contentHash)
            .addString(payTo)
            .addUint64(priceUsdc)
            .addUint64(priceTinybar)
            .addString(uri),
        )
        .execute(client)
        .then((res) => res.getRecord(client));
      const id = record.contractFunctionResult?.getUint256(0);
      if (!id) throw new Error("register returned no id");
      return { id: Number(id.toString()), transactionId: record.transactionId.toString() };
    },

    async issue(registryId, payerAccount, transactionId) {
      const { evm_address } = await account(payerAccount);
      await new ContractExecuteTransaction()
        .setContractId(contract)
        .setGas(200_000)
        .setFunction(
          "issue",
          new ContractFunctionParameters()
            .addUint256(registryId)
            .addAddress(evm_address)
            .addString(transactionId),
        )
        .execute(client)
        .then((res) => res.getReceipt(client));
    },
    async hasLicence(accountId, registryId) {
      const { evm_address } = await account(accountId);
      const res = await fetch(`${mirror()}/contracts/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: address,
          data: `${BALANCE_OF}${pad(evm_address)}${pad(registryId.toString(16))}`,
        }),
      });
      if (!res.ok) return false;
      const { result } = (await res.json()) as { result: string };
      return BigInt(result) > 0n;
    },
  };
}

export const identityMessage = (accountId: string, timestamp: string) =>
  `bajigur:${accountId}:${timestamp}`;

// ponytail: signed-header identity instead of SIWx; swap when @x402/extensions gains Hedera support
export const signedIdentity: Identity = async (headers) => {
  const accountId = headers.get("x-hedera-account");
  const timestamp = headers.get("x-hedera-timestamp");
  const signature = headers.get("x-hedera-signature");
  if (!accountId || !timestamp || !signature) return undefined;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) return undefined;
  const { key } = await account(accountId);
  if (key._type !== "ECDSA_SECP256K1") return undefined;
  const ok = PublicKey.fromStringECDSA(key.key).verify(
    Buffer.from(identityMessage(accountId, timestamp)),
    Buffer.from(signature, "hex"),
  );
  return ok ? accountId : undefined;
};
