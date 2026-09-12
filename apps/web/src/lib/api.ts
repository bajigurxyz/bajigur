/**
 * Client for the Bajigur API (apps/api).
 *
 * Every path lives in ENDPOINTS so a change is one edit. The catalogue is
 * free and public; a prompt BODY only ever travels through the x402-gated
 * unlock route, which the browser never calls directly — `/api/unlock/:id`
 * in this app does it server side (see app/api/unlock/[id]/route.ts).
 */

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://api-production-fe21.up.railway.app"
).replace(/\/+$/, "");

const ENDPOINTS = {
  /** Free catalogue: every prompt, bodies stripped. */
  prompts: () => `${API_BASE}/prompts`,
  /** One catalogue entry; 404 for an unknown id. */
  prompt: (id: string) => `${API_BASE}/prompts/${encodeURIComponent(id)}`,
  /** Prompts a wallet holds an ERC-1155 licence for. Accepts 0.0.x or an ENS name. */
  licenses: (account: string) => `${API_BASE}/licenses/${encodeURIComponent(account)}`,
  /** x402-gated full body. Server side only — the 402 challenge rides in a header. */
  unlock: (id: string) => `${API_BASE}/prompts/${encodeURIComponent(id)}/unlock`,
} as const;

/**
 * The public face of a prompt, mirroring `publicPrompt()` in apps/api. There
 * is deliberately no `body` field: adding one here would be a route to
 * leaking paid content into the catalogue response.
 */
export interface Prompt {
  id: string;
  title: string;
  tags: string[];
  preview: string;
  /** Decimal USD string, e.g. "0.10" — the price of one unlock in USDC. */
  priceUsd: string;
  /** Decimal HBAR string, the same unlock priced in the native asset. */
  priceHbar: string;
  /** Token id in PromptRegistry; absent means no licence is minted for it. */
  registryId?: number;
  /** ENS name under bajigur.eth, e.g. "kiel.bajigur.eth". */
  creator?: string;
  /** Hedera account the 402 pays, resolved from the creator's ENS record. */
  payTo?: string;
  /** Absolute URL of a recording of this prompt's output, when the creator supplied one. */
  previewMedia?: string;
}

/** Thrown for non-OK responses so callers can branch on status (404 → not-found). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, `${res.status} for ${url}`);
  return (await res.json()) as T;
}

export const fetchPrompts = () => getJson<Prompt[]>(ENDPOINTS.prompts());
export const fetchPrompt = (id: string) => getJson<Prompt>(ENDPOINTS.prompt(id));

/** `account` may be a Hedera id (0.0.x) or an ENS name — the API resolves both. */
export const fetchLicenses = (account: string) => getJson<Prompt[]>(ENDPOINTS.licenses(account));

/** Absolute unlock URL, for the server-side x402 client. */
export const unlockUrl = (id: string) => ENDPOINTS.unlock(id);

/** Every distinct tag in the catalogue, in first-seen order — the filter's source. */
export function tagsOf(prompts: Prompt[]): string[] {
  const seen = new Set<string>();
  for (const prompt of prompts) for (const tag of prompt.tags) seen.add(tag);
  return [...seen];
}

/** "0.10" → "$0.10". Prices arrive as decimal strings, so this only adds the symbol. */
export const formatUsd = (priceUsd: string) => `$${priceUsd}`;

/**
 * "0.2" → "0.2 HBAR".
 *
 * Spelled out rather than using the ℏ sign: nobody reads a currency they have
 * to decode, and the whole point of showing two prices is that the choice is
 * obvious.
 */
export const formatHbar = (priceHbar: string) => `${priceHbar} HBAR`;
