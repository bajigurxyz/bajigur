import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";

export type Ens = { text(name: string, key: string): Promise<string | null> };

// ENSv2 beta on Sepolia; addresses from docs.ens.domains/learn/deployments
export const UNIVERSAL_RESOLVER_V2 = "0x4a1817d13e9cf196f471725176355c1234b63c70";

export function ensClient(): Ens {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });
  const cache = new Map<string, { value: string | null; at: number }>();
  // ponytail: 60s in-memory cache so a 402 never waits on Sepolia twice in a row
  return {
    async text(name, key) {
      const id = `${name}:${key}`;
      const hit = cache.get(id);
      if (hit && Date.now() - hit.at < 60_000) return hit.value;
      const value = await client.getEnsText({
        name: normalize(name),
        key,
        universalResolverAddress: UNIVERSAL_RESOLVER_V2,
      });
      cache.set(id, { value, at: Date.now() });
      return value;
    },
  };
}

export const isEnsName = (value: string) => value.endsWith(".eth");

export async function hederaAccountOf(nameOrAccount: string, ens: Ens) {
  if (!isEnsName(nameOrAccount)) return nameOrAccount;
  const account = await ens.text(nameOrAccount, "bajigur.hedera");
  if (!account) throw new Error(`${nameOrAccount} has no bajigur.hedera record`);
  return account;
}

/// 3-32 chars of [a-z0-9-], no leading or trailing hyphen. Mirrors BajigurRegistrar.isValidLabel.
export const isValidLabel = (label: string) =>
  /^[a-z0-9-]{3,32}$/.test(label) && !label.startsWith("-") && !label.endsWith("-");

const REGISTRAR_ABI = [
  {
    type: "function",
    name: "isAvailable",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "labelOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "claimFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "hederaAccount", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type Registrar = {
  parent: string;
  available(label: string): Promise<boolean>;
  labelOf(owner: string): Promise<string | null>;
  claim(label: string, owner: string, hederaAccount: string): Promise<string>;
};

/// Claims subnames on the user's behalf: the platform pays the Sepolia gas, the user owns the name.
export function registrarClient(): Registrar | undefined {
  const address = process.env.BAJIGUR_REGISTRAR as `0x${string}` | undefined;
  const key = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
  const parent = process.env.ENS_NAME;
  if (!address || !key || !parent) return undefined;

  const transport = http(process.env.SEPOLIA_RPC_URL);
  const client = createPublicClient({ chain: sepolia, transport });
  const wallet = createWalletClient({
    chain: sepolia,
    transport,
    account: privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`),
  });
  const names = new Map<string, { label: string | null; at: number }>();
  return {
    parent,
    available: (label) =>
      client.readContract({
        address,
        abi: REGISTRAR_ABI,
        functionName: "isAvailable",
        args: [label],
      }),
    async labelOf(owner) {
      const hit = names.get(owner);
      if (hit && Date.now() - hit.at < 60_000) return hit.label;
      const label =
        (await client.readContract({
          address,
          abi: REGISTRAR_ABI,
          functionName: "labelOf",
          args: [owner as `0x${string}`],
        })) || null;
      names.set(owner, { label, at: Date.now() });
      return label;
    },
    async claim(label, owner, hederaAccount) {
      const hash = await wallet.writeContract({
        address,
        abi: REGISTRAR_ABI,
        functionName: "claimFor",
        args: [label, owner as `0x${string}`, hederaAccount],
      });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error(`claim reverted (${hash})`);
      names.set(owner, { label, at: Date.now() });
      return hash;
    },
  };
}
