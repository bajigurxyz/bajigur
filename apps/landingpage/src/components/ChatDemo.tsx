"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** The marketplace listing this exchange actually ends in. */
const PROMPT_PREVIEW =
  "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/hero%20sections/animated%20(20).webp";

type Entry = { speaker: "agent" | "bajigur"; text: string; showsWork?: boolean };

/**
 * A real exchange, not an aspirational one. Every number is what the live
 * catalogue quotes for `nova-ai-cinematic-landing`, and the reply the agent
 * ends up with is that listing's own recording.
 */
const TRANSCRIPT: Entry[] = [
  { speaker: "agent", text: "create one landing page" },
  {
    speaker: "bajigur",
    text: "Cinematic scroll-scrubbed landing page, by kiel.bajigur.eth. 0.20 USDC or 2 HBAR.",
  },
  { speaker: "agent", text: "pay with usdc" },
  {
    speaker: "bajigur",
    text: "Paid. Licence minted to your wallet. Here's the web:",
    showsWork: true,
  },
];

const SPEAKER = { agent: "alice.bajigur.eth", bajigur: "Bajigur" } as const;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Types the transcript out once, the first time it scrolls into view.
 *
 * A pause before each Bajigur reply is what makes it read as an exchange rather
 * than as text appearing. It plays once: a transcript that loops forever
 * competes with the prose around it for the reader's attention.
 *
 * Reduced motion gets the finished transcript immediately. Cancelling the
 * animation without filling it in would leave the section permanently blank.
 */
function useTypedTranscript(active: boolean) {
  const [typed, setTyped] = useState<string[]>(() => TRANSCRIPT.map(() => ""));
  const [typingIndex, setTypingIndex] = useState(-1);
  const [thinking, setThinking] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    if (!active || played.current) return;
    played.current = true;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (delay: number, run: () => void) => {
      timers.push(setTimeout(run, delay));
    };

    if (reducedMotion()) {
      at(0, () => setTyped(TRANSCRIPT.map((entry) => entry.text)));
      return () => {
        for (const timer of timers) clearTimeout(timer);
      };
    }

    let clock = 0;
    TRANSCRIPT.forEach((entry, index) => {
      if (entry.speaker === "bajigur") {
        at(clock, () => setThinking(true));
        clock += 700;
        at(clock, () => setThinking(false));
      }
      at(clock, () => setTypingIndex(index));
      const perCharacter = 18;
      for (let n = 1; n <= entry.text.length; n += 1) {
        at(clock + n * perCharacter, () =>
          setTyped((previous) => {
            if (previous[index]?.length === n) return previous;
            const next = [...previous];
            next[index] = entry.text.slice(0, n);
            return next;
          }),
        );
      }
      clock += entry.text.length * perCharacter + 420;
    });
    at(clock, () => setTypingIndex(-1));

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [active]);

  return { typed, typingIndex, thinking };
}

/** One-shot in-view flag, so the transcript starts when it is actually read. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      // jsdom and any browser without it: show the section rather than hide it.
      setTimeout(() => setInView(true), 0);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, inView] as const;
}

/**
 * What buying a prompt actually looks like from inside an agent.
 *
 * The section above this one explains the wiring; this one shows the result,
 * which is the part a reader remembers. It sits below because the argument only
 * lands once you know there is nothing to install.
 */
export default function ChatDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const { typed, typingIndex, thinking } = useTypedTranscript(inView);

  return (
    <section ref={ref} className="w-full bg-[#F4F2EF] px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm tracking-widest text-gray-500 uppercase">In practice</p>
        <h2 className="mb-4 text-4xl font-normal tracking-tight text-[#141414] sm:text-5xl">
          One line in, a paid licence out
        </h2>
        <p className="mb-14 max-w-2xl text-base leading-relaxed text-gray-600">
          No checkout, no invoice, no card. The agent asks, Bajigur quotes the creator&apos;s own
          price in both assets, and the licence lands in the wallet the agent already had.
        </p>

        <div className="flex flex-col gap-5">
          {TRANSCRIPT.map((entry, index) => {
            const isAgent = entry.speaker === "agent";
            const startsRun = index === 0 || TRANSCRIPT[index - 1]?.speaker !== entry.speaker;
            const shown = typed[index] ?? "";
            const started = shown.length > 0 || index === typingIndex;

            return (
              <div
                key={entry.text}
                className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}
              >
                {startsRun && (
                  <span
                    className={`mb-2 px-3 font-mono text-xs text-gray-500 transition-opacity duration-300 ${
                      started ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {SPEAKER[entry.speaker]}
                  </span>
                )}
                {/*
                  Every bubble is laid out from the start and only faded in, so
                  the section's height never changes while the transcript types.
                  Adding them as they arrive made the page jump under the reader.
                */}
                <div
                  className={`max-w-[85%] rounded-3xl px-6 py-4 text-lg leading-snug tracking-tight transition-opacity duration-300 sm:text-xl ${
                    started ? "opacity-100" : "opacity-0"
                  } ${isAgent ? "bg-black/[0.06] text-[#141414]" : "bg-[#141414] text-[#F4F2EF]"}`}
                >
                  <span className="font-light">{shown || entry.text}</span>
                  {index === typingIndex && (
                    <span className="ml-1 inline-block h-[0.7em] w-[0.06em] animate-pulse bg-current align-middle" />
                  )}

                  {entry.showsWork && (
                    <span
                      className={`mt-4 block overflow-hidden rounded-2xl transition-opacity duration-700 ${
                        shown.length === entry.text.length ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {/*
                        `unoptimized` on purpose: this is an animated WebP and
                        the optimizer would flatten it to a still frame, which
                        is the part worth showing.
                      */}
                      <Image
                        src={PROMPT_PREVIEW}
                        alt="The landing page this prompt produces"
                        width={1280}
                        height={720}
                        unoptimized
                        className="block aspect-[16/9] w-full object-cover"
                      />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex h-3 items-center justify-end gap-1.5 pr-6">
          {thinking &&
            [0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-2 w-2 animate-pulse rounded-full bg-black/40"
                style={{ animationDelay: `${dot * 0.15}s` }}
              />
            ))}
        </div>
      </div>
    </section>
  );
}
