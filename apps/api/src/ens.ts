import { createPublicClient, http } from "viem";
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
