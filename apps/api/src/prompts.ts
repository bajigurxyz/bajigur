import { readFileSync } from "node:fs";
import { type Ens, hederaAccountOf } from "./ens";

export type Prompt = {
  id: string;
  title: string;
  tags: string[];
  preview: string;
  priceUsd: string;
  priceHbar: string;
  registryId?: number;
  payTo?: string;
  creator?: string;
  previewMedia?: string;
  body: string;
};

const catalog = (file: string) =>
  readFileSync(new URL(`./catalog/${file}`, import.meta.url), "utf8").trim();

// Seed catalogue: bodies live in src/catalog and ship with the bundle. Everything a
// creator publishes is in Postgres and merged in by `loadPrompts` (src/store.ts).
const seeds: Prompt[] = [
  {
    id: "nova-ai-cinematic-landing",
    title: "Cinematic scroll-scrubbed landing page",
    tags: ["landing", "hero", "scroll", "video", "react", "tailwind"],
    preview:
      "Dark single-page site with a scroll-scrubbed video background, staggered reveal text, corner nav and pill CTAs. Vite + React + Tailwind, full component spec.",
    previewMedia:
      "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/hero%20sections/animated%20(20).webp",
    priceUsd: "0.20",
    priceHbar: "2",
    registryId: 5,
    body: catalog("nova-ai-cinematic-landing.md"),
  },
  {
    id: "core-features-tabs",
    title: "Core features tabbed showcase",
    tags: ["features", "tabs", "spotlight", "dashboard", "framer-motion", "react", "tailwind"],
    preview:
      "Auto-rotating four-tab feature showcase with mouse-tracked spotlight borders, cross-fading screenshots and a scaled dashboard mock overlay. Full component and asset spec.",
    previewMedia: "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/animated%20(30).webp",
    priceUsd: "1.00",
    priceHbar: "10",
    registryId: 6,
    body: catalog("core-features-tabs.md"),
  },
];

export const prompts: Prompt[] = [...seeds];

export const findPrompt = (id: string) => prompts.find((p) => p.id === id);

/// Replaces the published half of the catalogue, leaving the seeds alone.
export function loadPrompts(published: Prompt[]) {
  prompts.length = 0;
  prompts.push(...seeds, ...published);
}

export function addPrompt(prompt: Prompt) {
  prompts.push(prompt);
}

export function removePrompt(id: string) {
  const at = prompts.findIndex((p) => p.id === id);
  if (at >= 0) prompts.splice(at, 1);
}

/// A readable, stable id from the title, with a suffix when it collides.
export function slugFor(title: string) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "prompt";
  if (!findPrompt(base)) return base;
  for (let n = 2; ; n++) if (!findPrompt(`${base}-${n}`)) return `${base}-${n}`;
}

export function platformAccount() {
  const account = process.env.X402_PAY_TO_ADDRESS;
  if (!account) throw new Error("X402_PAY_TO_ADDRESS is not set");
  return account;
}

// Seeds belong to the platform's creator name once ENS is configured. A published prompt
// carries its own payTo, and must never inherit that name: payToOf resolves a creator name
// to its own account, so inheriting it would pay us for somebody else's work.
export const creatorOf = (prompt: Pick<Prompt, "creator" | "payTo">) =>
  prompt.creator ??
  (prompt.payTo || !process.env.ENS_NAME ? undefined : `kiel.${process.env.ENS_NAME}`);

// Creator payout: the creator's ENS `bajigur.hedera` record when set, else the prompt's payTo, else the platform.
export async function payToOf(prompt: Pick<Prompt, "payTo" | "creator">, ens?: Ens) {
  const creator = creatorOf(prompt);
  if (creator && ens) return hederaAccountOf(creator, ens);
  return prompt.payTo ?? platformAccount();
}

export async function publicPrompt({ body: _body, ...rest }: Prompt, ens?: Ens) {
  return { ...rest, creator: creatorOf(rest), payTo: await payToOf(rest, ens) };
}

export function tinybars(hbar: string) {
  const [whole = "0", fraction = ""] = hbar.split(".");
  return `${BigInt(whole)}${fraction.padEnd(8, "0").slice(0, 8)}`.replace(/^0+(?=\d)/, "");
}
