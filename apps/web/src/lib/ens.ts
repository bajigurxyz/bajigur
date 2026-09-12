/** The parent every Bajigur name sits under. */
export const ENS_PARENT = process.env.NEXT_PUBLIC_ENS_NAME ?? "bajigur.eth";

/**
 * Mirrors `BajigurRegistrar.isValidLabel`: 3 to 32 characters of [a-z0-9-],
 * with no leading or trailing hyphen. Checked here so a bad label is refused
 * before it costs a round trip, never instead of the contract checking it.
 */
export function labelError(label: string): string | undefined {
  if (label.length < 3) return "At least 3 characters.";
  if (label.length > 32) return "At most 32 characters.";
  if (!/^[a-z0-9-]+$/.test(label)) return "Lowercase letters, numbers and hyphens only.";
  if (label.startsWith("-") || label.endsWith("-")) return "Cannot start or end with a hyphen.";
  return undefined;
}

export interface EnsName {
  /** The full name, e.g. "axel.bajigur.eth". */
  name: string;
  /** The Hedera account its bajigur.hedera record points at. */
  hedera?: string;
}
