export type Prompt = {
  id: string;
  title: string;
  tags: string[];
  preview: string;
  priceUsd: string;
  payTo: string;
  body: string;
};

const platformAccount = () => process.env.X402_PAY_TO_ADDRESS ?? "0.0.0";

// ponytail: in-memory catalogue seeded by the team; move to a DB when creators publish from the web app
export const prompts: Prompt[] = [
  {
    id: "hero-scroll-reveal",
    title: "Hero scroll reveal",
    tags: ["hero", "scroll", "gsap"],
    preview: "Pinned hero with staggered headline reveal and parallax media on scroll.",
    priceUsd: "0.10",
    payTo: platformAccount(),
    body: "Build a pinned hero section. On load, split the headline into words and reveal them with a 40ms stagger, 0.8s ease-out, from y:40 to y:0 with opacity 0 to 1. While the hero is pinned, scrub a parallax on the media: translateY from 0 to -120px over 100vh of scroll. Use GSAP ScrollTrigger. Respect prefers-reduced-motion by disabling parallax and collapsing stagger to 0.",
  },
  {
    id: "magnetic-buttons",
    title: "Magnetic buttons",
    tags: ["button", "cursor", "micro-interaction"],
    preview:
      "Buttons that lean toward the cursor within a 80px radius and snap back with spring easing.",
    priceUsd: "0.05",
    payTo: platformAccount(),
    body: "Add a magnetic effect to primary buttons. Track pointer position within an 80px radius of each button; translate the button toward the pointer by 30% of the offset, max 12px. On leave, return with a spring: stiffness 300, damping 20. Move the label an extra 10% for depth. Disable on touch devices and under prefers-reduced-motion.",
  },
  {
    id: "marquee-logos",
    title: "Infinite logo marquee",
    tags: ["marquee", "logos", "css"],
    preview: "Seamless infinite logo strip in pure CSS that pauses on hover.",
    priceUsd: "0.02",
    payTo: platformAccount(),
    body: "Create a logo marquee with pure CSS. Duplicate the logo track once so the loop is seamless, animate translateX from 0 to -50% over 30s linear infinite, and pause the animation on hover. Fade both edges with a mask-image linear gradient. Logos are 32px tall, 64px gap, grayscale at 60% opacity, full color on hover.",
  },
];

export const findPrompt = (id: string) => prompts.find((p) => p.id === id);

export const publicPrompt = ({ body: _body, ...rest }: Prompt) => rest;
