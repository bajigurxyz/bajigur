export const APP_NAME = "bajigur";

/** A checksummed EVM address, shared across apps and contracts. */
export type Address = `0x${string}`;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isAddress(value: string): value is Address {
  return ADDRESS_RE.test(value);
}
