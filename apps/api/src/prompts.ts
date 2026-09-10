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
  body: string;
};

// ponytail: in-memory catalogue seeded by the team; move to a DB when creators publish from the web app
export const prompts: Prompt[] = [
  {
    id: "hero-scroll-reveal",
    title: "Hero scroll reveal",
    tags: ["hero", "scroll", "gsap"],
    preview: "Pinned hero with staggered headline reveal and parallax media on scroll.",
    priceUsd: "0.10",
    priceHbar: "1",
    registryId: 1,
    body: "Build a pinned hero section. On load, split the headline into words and reveal them with a 40ms stagger, 0.8s ease-out, from y:40 to y:0 with opacity 0 to 1. While the hero is pinned, scrub a parallax on the media: translateY from 0 to -120px over 100vh of scroll. Use GSAP ScrollTrigger. Respect prefers-reduced-motion by disabling parallax and collapsing stagger to 0.",
  },
  {
    id: "magnetic-buttons",
    title: "Magnetic buttons",
    tags: ["button", "cursor", "micro-interaction"],
    preview:
      "Buttons that lean toward the cursor within a 80px radius and snap back with spring easing.",
    priceUsd: "0.05",
    priceHbar: "0.5",
    registryId: 2,
    body: "Add a magnetic effect to primary buttons. Track pointer position within an 80px radius of each button; translate the button toward the pointer by 30% of the offset, max 12px. On leave, return with a spring: stiffness 300, damping 20. Move the label an extra 10% for depth. Disable on touch devices and under prefers-reduced-motion.",
  },
  {
    id: "glass-nav",
    title: "Glass navigation bar",
    tags: ["nav", "glassmorphism", "scroll"],
    preview: "Sticky translucent nav that gains blur and a hairline border once the page scrolls.",
    priceUsd: "0.05",
    priceHbar: "0.5",
    registryId: 4,
    creator: process.env.ENS_NAME ? `axel.${process.env.ENS_NAME}` : undefined,
    payTo: process.env.HEDERA_OPERATOR_ID,
    body: "Build a sticky top navigation. At scrollY 0 it is fully transparent with white text. Past 24px of scroll, transition over 300ms ease-out to background rgba(255,255,255,0.72), backdrop-filter blur(16px) saturate(160%), a 1px bottom border at rgba(0,0,0,0.08), and dark text. Keep the logo 24px tall and links 14px with 24px gaps. Under prefers-reduced-motion switch states instantly.",
  },
  {
    id: "marquee-logos",
    title: "Infinite logo marquee",
    tags: ["marquee", "logos", "css"],
    preview: "Seamless infinite logo strip in pure CSS that pauses on hover.",
    priceUsd: "0.02",
    priceHbar: "0.2",
    registryId: 3,
    body: "Create a logo marquee with pure CSS. Duplicate the logo track once so the loop is seamless, animate translateX from 0 to -50% over 30s linear infinite, and pause the animation on hover. Fade both edges with a mask-image linear gradient. Logos are 32px tall, 64px gap, grayscale at 60% opacity, full color on hover.",
  },
];

export const findPrompt = (id: string) => prompts.find((p) => p.id === id);

export function platformAccount() {
  const account = process.env.X402_PAY_TO_ADDRESS;
  if (!account) throw new Error("X402_PAY_TO_ADDRESS is not set");
  return account;
}

// Seeds belong to the platform's creator name once ENS is configured.
export const creatorOf = (prompt: Pick<Prompt, "creator">) =>
  prompt.creator ?? (process.env.ENS_NAME ? `kiel.${process.env.ENS_NAME}` : undefined);

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
