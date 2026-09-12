"use client";

import Image from "next/image";
import { useState } from "react";

type Sponsor = { name: string; src: string; href: string; wordmark?: boolean };

const CDN = "https://cdn.ethglobal.com/organizations";

/**
 * The networks Bajigur is built on, and the event it was built for.
 *
 * Served from ETHGlobal's own CDN rather than copied in. These are other
 * people's trademarks, and a copy in our repo is a copy that goes stale the day
 * a brand is refreshed. `page.test.tsx` allows this one host and no other.
 *
 * Two of them are wide wordmarks rather than square marks, and both are served
 * from our own public folder: they already have transparent backgrounds, which
 * is the thing the CDN copies do not, and 8004scan's own URL carries a
 * deployment hash that changes under us.
 */
const SPONSORS: Sponsor[] = [
  { name: "Hedera", src: `${CDN}/bdi3h/square-logo/default.png`, href: "https://hedera.com" },
  { name: "Privy", src: `${CDN}/ijybm/square-logo/default.png`, href: "https://privy.io" },
  { name: "ENS", src: `${CDN}/bw7y9/square-logo/default.png`, href: "https://ens.domains" },
  { name: "ETHGlobal", src: "/ethglobal.png", href: "https://ethglobal.com", wordmark: true },
  { name: "8004scan", src: "/8004scan.svg", href: "https://8004scan.io", wordmark: true },
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
          width={sponsor.wordmark ? 320 : 96}
          height={sponsor.wordmark ? 96 : 96}
          onError={() => setFailed(true)}
          className={
            sponsor.wordmark
              ? // Already transparent, so it needs no blend trick: the
                // photograph shows through the gaps in the mark itself.
                "h-6 w-auto sm:h-8"
              : // Square marks with the brand's own colour baked in. Cropping
                // them to a circle is what removes Hedera's white corners
                // without touching anyone's colours.
                "h-9 w-9 rounded-full object-cover sm:h-11 sm:w-11"
          }
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
