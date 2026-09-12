import {
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  PrivateKey,
  type PublicKey,
  TransactionId,
} from "@hiero-ledger/sdk";
import { keccak_256 } from "@noble/hashes/sha3";
import { decodeFunctionResult, encodeFunctionData } from "viem";
import type { Signer } from "./agent";

/// ERC-8004 on Hedera testnet. The two registries are deployed as singletons and the
/// reputation one already points at the identity one, so this is Hedera and ERC-8004 at once.
export const IDENTITY_REGISTRY =
  process.env.ERC8004_IDENTITY_REGISTRY ?? "0x8004A818BFB912233c491871b3d84c89A494BD9e";
export const REPUTATION_REGISTRY =
  process.env.ERC8004_REPUTATION_REGISTRY ?? "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const network = () => process.env.HEDERA_NETWORK ?? "testnet";
const mirror = () => `https://${network()}.mirrornode.hedera.com/api/v1`;
const chainId = () => (network() === "mainnet" ? 295 : 296);

/// How a creator's ENS name carries its agent: one text record, readable by anyone.
export const agentRef = (agentId: number) => `eip155:${chainId()}:${IDENTITY_REGISTRY}:${agentId}`;

export const agentIdFrom = (record: string | null) => {
  const id = Number(record?.split(":").at(-1));
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

export type Feedback = {
  agentId: number;
  value: number;
  tag1: string;
  tag2: string;
  feedbackURI: string;
  feedbackHash: Uint8Array;
  account: string;
  publicKey: PublicKey;
  walletId: string;
};

export type Reputation = {
  registerCreator(name: string, ownerEvm: string, agentURI: string): Promise<number>;
  describeAgent(agentId: number, name: string, agentURI: string): Promise<void>;
  giveFeedback(input: Feedback): Promise<string>;
  summary(agentId: number): Promise<{ count: number; value: number }>;
};

const call = async (to: string, data: string) => {
  const res = await fetch(`${mirror()}/contracts/call`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to, data }),
  });
  if (!res.ok) throw new Error(`mirror call failed: ${res.status}`);
  return ((await res.json()) as { result: string }).result as `0x${string}`;
};

export function reputation(signer?: Signer): Reputation | undefined {
  const operator = process.env.X402_PAY_TO_ADDRESS;
  const key = process.env.X402_PAY_TO_KEY;
  if (!operator || !key || !signer) {
    console.warn("reputation disabled: set X402_PAY_TO_ADDRESS, X402_PAY_TO_KEY and Privy");
    return undefined;
  }
  const client = () =>
    Client.forName(network()).setOperator(
      AccountId.fromString(operator),
      PrivateKey.fromStringECDSA(key),
    );
  const identity = ContractId.fromEvmAddress(0, 0, IDENTITY_REGISTRY);
  const reputationId = ContractId.fromEvmAddress(0, 0, REPUTATION_REGISTRY);

  return {
    /// Mints the creator's agent, records their ENS name on it, and hands the token to
    /// them. The creator owning it is what makes the reputation theirs rather than ours,
    /// and the registry refuses feedback from an agent's own owner.
    async registerCreator(name, ownerEvm, agentURI) {
      const c = client();
      try {
        const record = await new ContractExecuteTransaction()
          .setContractId(identity)
          .setGas(900_000)
          .setFunction("register", new ContractFunctionParameters().addString(agentURI))
          .execute(c)
          .then((r) => r.getRecord(c));
        const agentId = Number(record.contractFunctionResult?.getUint256(0)?.toString());
        if (!agentId) throw new Error("register returned no agent id");

        await new ContractExecuteTransaction()
          .setContractId(identity)
          .setGas(400_000)
          .setFunction(
            "setMetadata",
            new ContractFunctionParameters()
              .addUint256(agentId)
              .addString("ens")
              .addBytes(new TextEncoder().encode(name)),
          )
          .execute(c)
          .then((r) => r.getReceipt(c));

        // msg.sender inside the EVM is whatever address this Hedera account maps to, so
        // ask the registry who it minted to rather than guessing the operator's form.
        const minted = decodeFunctionResult({
          abi: ID_ABI,
          functionName: "ownerOf",
          data: await call(
            IDENTITY_REGISTRY,
            encodeFunctionData({ abi: ID_ABI, functionName: "ownerOf", args: [BigInt(agentId)] }),
          ),
        });
        await new ContractExecuteTransaction()
          .setContractId(identity)
          .setGas(400_000)
          .setFunction(
            "transferFrom",
            new ContractFunctionParameters()
              .addAddress(minted)
              .addAddress(ownerEvm)
              .addUint256(agentId),
          )
          .execute(c)
          .then((r) => r.getReceipt(c));
        return agentId;
      } finally {
        c.close();
      }
    },

    /// Points an agent we already own at its card and its ENS name. Owner only.
    async describeAgent(agentId, name, agentURI) {
      const c = client();
      try {
        for (const [fn, params] of [
          ["setAgentURI", new ContractFunctionParameters().addUint256(agentId).addString(agentURI)],
          [
            "setMetadata",
            new ContractFunctionParameters()
              .addUint256(agentId)
              .addString("ens")
              .addBytes(new TextEncoder().encode(name)),
          ],
        ] as const) {
          await new ContractExecuteTransaction()
            .setContractId(identity)
            .setGas(500_000)
            .setFunction(fn, params)
            .execute(c)
            .then((r) => r.getReceipt(c));
        }
      } finally {
        c.close();
      }
    },

    /// Signed and paid by the buyer's own Privy wallet: the registry rejects feedback
    /// from the agent's owner, and a rating nobody staked anything on is worth nothing.
    async giveFeedback(input) {
      const c = client();
      try {
        const account = AccountId.fromString(input.account);
        const tx = new ContractExecuteTransaction()
          .setContractId(reputationId)
          .setGas(800_000)
          .setFunction(
            "giveFeedback",
            new ContractFunctionParameters()
              .addUint256(input.agentId)
              .addInt128(input.value)
              .addUint8(0)
              .addString(input.tag1)
              .addString(input.tag2)
              .addString("")
              .addString(input.feedbackURI)
              .addBytes32(input.feedbackHash),
          )
          .setTransactionId(TransactionId.generate(account))
          .freezeWith(c);
        await tx.signWith(input.publicKey, async (body) =>
          (await signer.signHash(input.walletId, keccak_256(body))).subarray(0, 64),
        );
        const res = await tx.execute(c);
        await res.getReceipt(c);
        return res.transactionId.toString();
      } finally {
        c.close();
      }
    },

    /// getSummary insists on an explicit client list, so ask the registry who rated
    /// this agent first. No clients means nobody has rated them yet.
    async summary(agentId) {
      const clients = decodeFunctionResult({
        abi: REP_ABI,
        functionName: "getClients",
        data: await call(
          REPUTATION_REGISTRY,
          encodeFunctionData({ abi: REP_ABI, functionName: "getClients", args: [BigInt(agentId)] }),
        ),
      });
      if (!clients.length) return { count: 0, value: 0 };
      const [count, value] = decodeFunctionResult({
        abi: REP_ABI,
        functionName: "getSummary",
        data: await call(
          REPUTATION_REGISTRY,
          encodeFunctionData({
            abi: REP_ABI,
            functionName: "getSummary",
            args: [BigInt(agentId), [...clients], "", ""],
          }),
        ),
      });
      return { count: Number(count), value: Number(value) };
    },
  };
}

const ID_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

const REP_ABI = [
  {
    type: "function",
    name: "getClients",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "getSummary",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
  },
] as const;
