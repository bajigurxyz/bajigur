/// Validation for creator-published prompts. Everything here is enforced server side
/// because the form sending it is not something the API can trust.

export type PublishInput = {
  title?: unknown;
  preview?: unknown;
  body?: unknown;
  tags?: unknown;
  priceUsd?: unknown;
  priceHbar?: unknown;
  previewMedia?: unknown;
};

export type Published = {
  title: string;
  preview: string;
  body: string;
  tags: string[];
  priceUsd: string;
  priceHbar: string;
  previewMedia?: string;
};

const text = (value: unknown, min: number, max: number) =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max
    ? value.trim()
    : undefined;

// Decimal strings, never floats: 0.1 USDC is not representable in binary and a payment
// one atomic unit off is refused.
const decimal = (value: unknown, places: number, max: number) => {
  if (typeof value !== "string" || !new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(value)) return;
  const n = Number(value);
  return n > 0 && n <= max ? value : undefined;
};

export const atomic = (value: string, decimals: number) => {
  const [whole = "0", fraction = ""] = value.split(".");
  return `${BigInt(whole)}${fraction.padEnd(decimals, "0").slice(0, decimals)}`.replace(
    /^0+(?=\d)/,
    "",
  );
};

/// What a browser can actually show. Without this a creator can point the field at
/// anything and the card renders an empty box.
///
/// The host is deliberately not restricted. Creators arrive with the recording
/// already hosted somewhere — their own site, a CDN, wherever the work lives —
/// and an allowlist meant every one of them had to re-upload to our bucket
/// before they could publish at all. The URL is only ever put in an `<img>` or
/// `<video>` src, so an unknown host can serve a broken file or see the
/// visitor's IP, and nothing more; that is the cost of hotlinking, and it is
/// the creator's own name on the card that carries it.
const PREVIEW_TYPES = /\.(webp|gif|png|jpe?g|mp4|webm)$/i;

export function validate(input: PublishInput): { error: string } | { prompt: Published } {
  const title = text(input.title, 3, 120);
  if (!title) return { error: "title must be 3-120 characters" };
  const preview = text(input.preview, 20, 500);
  if (!preview) return { error: "preview must be 20-500 characters" };
  const body = text(input.body, 50, 100_000);
  if (!body) return { error: "body must be 50-100000 characters" };

  const priceUsd = decimal(input.priceUsd, 6, 1000);
  if (!priceUsd) return { error: "priceUsd must be a decimal string above 0 and at most 1000" };
  const priceHbar = decimal(input.priceHbar, 8, 100_000);
  if (!priceHbar) return { error: "priceHbar must be a decimal string above 0 and at most 100000" };

  const tags = Array.isArray(input.tags)
    ? input.tags.filter((t): t is string => typeof t === "string" && /^[a-z0-9-]{2,24}$/.test(t))
    : [];
  if (tags.length > 12) return { error: "at most 12 tags" };

  let previewMedia: string | undefined;
  if (input.previewMedia !== undefined && input.previewMedia !== "") {
    if (typeof input.previewMedia !== "string") return { error: "previewMedia must be a URL" };
    let url: URL;
    try {
      url = new URL(input.previewMedia);
    } catch {
      return { error: "previewMedia must be an absolute https URL" };
    }
    if (url.protocol !== "https:") return { error: "previewMedia must be an absolute https URL" };
    if (!PREVIEW_TYPES.test(decodeURIComponent(url.pathname))) {
      return { error: "previewMedia must be a .webp, .gif, .png, .jpg, .mp4 or .webm file" };
    }
    previewMedia = url.toString();
  }

  return {
    prompt: {
      title,
      preview,
      body,
      tags,
      priceUsd,
      priceHbar,
      ...(previewMedia ? { previewMedia } : {}),
    },
  };
}

// ponytail: per-instance counter. A shared limiter when there is more than one instance.
export function rateLimit(perHour = 5) {
  const seen = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const recent = (seen.get(key) ?? []).filter((at) => now - at < 3_600_000);
    if (recent.length >= perHour) return false;
    seen.set(key, [...recent, now]);
    return true;
  };
}
