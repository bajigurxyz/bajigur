"use client";

import Image from "next/image";
import { useState } from "react";

type Sponsor = { name: string; src: string; href: string };

const CDN = "https://cdn.ethglobal.com/organizations";

/**
 * The networks Bajigur is built on, and the event it was built for.
 *
 * Served from ETHGlobal's own CDN rather than copied in. These are other
 * people's trademarks, and a copy in our repo is a copy that goes stale the day
 * a brand is refreshed. `page.test.tsx` allows this one host and no other.
 *
 * ETHGlobal itself has no square mark there, so it falls back to its name.
 */
const SPONSORS: Sponsor[] = [
  { name: "Hedera", src: `${CDN}/bdi3h/square-logo/default.png`, href: "https://hedera.com" },
  { name: "Privy", src: `${CDN}/ijybm/square-logo/default.png`, href: "https://privy.io" },
  { name: "ENS", src: `${CDN}/bw7y9/square-logo/default.png`, href: "https://ens.domains" },
  { name: "ETHGlobal", src: "", href: "https://ethglobal.com" },
];

/**
 * One mark, or its name if the file is not there.
 *
 * The fallback is not a placeholder to be embarrassed about: the wordmark is
 * set in the same face as the rest of the hero, so a missing SVG reads as a
 * design choice rather than a broken image. Drop the file in and it upgrades
 * itself.
 */
function Mark({ sponsor }: { sponsor: Sponsor }) {
  const [failed, setFailed] = useState(!sponsor.src);

  return (
    <a
      href={sponsor.href}
      target="_blank"
      rel="noreferrer"
      aria-label={sponsor.name}
      className="flex shrink-0 items-center opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
    >
      {failed ? (
        <span
          className="text-lg whitespace-nowrap text-white italic sm:text-2xl md:text-3xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {sponsor.name}
        </span>
      ) : (
        <Image
          src={sponsor.src}
          alt={sponsor.name}
          width={140}
          height={40}
          onError={() => setFailed(true)}
          className="h-9 w-9 rounded-xl object-contain sm:h-11 sm:w-11"
        />
      )}
    </a>
  );
}

/** One pass of the marks, spread across at least the full width of the screen. */
function Half({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className="flex min-w-full shrink-0 items-center justify-around gap-10 px-5 sm:gap-16 md:gap-20"
    >
      {SPONSORS.map((sponsor) => (
        <Mark key={sponsor.name} sponsor={sponsor} />
      ))}
    </div>
  );
}

/**
 * A row that never ends, and never leaves a gap.
 *
 * Two identical halves translated by exactly half the track, so the seam
 * between the last mark and the first is invisible. Each half carries
 * `min-w-full`, which is the part that matters: four marks and their gaps are
 * narrower than a desktop screen, so without it the second half had not yet
 * arrived when the first walked off and the right side of the row sat empty.
 *
 * The copy is `aria-hidden`, so a screen reader hears each sponsor once.
 */
export default function SponsorMarquee() {
  return (
    <div className="w-full overflow-hidden">
      <div className="animate-marquee flex w-max items-center">
        <Half hidden={false} />
        <Half hidden />
      </div>
    </div>
  );
}
