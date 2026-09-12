import { Unlock } from "lucide-react";
import Link from "next/link";
import CopyPromptButton from "@/components/CopyPromptButton";
import CreatorRating from "@/components/CreatorRating";
import PromptPreview from "@/components/PromptPreview";
import { HbarMark, UsdcMark } from "@/components/TokenMark";
import { formatHbar, formatUsd, type Prompt } from "@/lib/api";

/**
 * One marketplace card.
 *
 * The recording leads. What a buyer is judging is what the prompt produces, and
 * a thumbnail the height of two lines of text cannot show that: the preview is
 * the product, so it gets the space and the card's full width, and the reading
 * matter sits under it.
 *
 * Promit's design review finding carries over: the action row is ALWAYS in the
 * layout, never revealed on hover. Hover-reveal hides actions from keyboard,
 * touch and assistive-tech users alike.
 *
 * A prompt whose creator supplied no recording falls back to text only, and the
 * card still works, so the catalogue never has a hole where an image failed.
 *
 * A prompt the wallet already owns offers to copy itself rather than to sell
 * itself again. The licence is onchain and permanent, so "Unlock" on something
 * already paid for reads as a second charge.
 */
export default function PromptCard({ prompt, owned = false }: { prompt: Prompt; owned?: boolean }) {
  const price = formatUsd(prompt.priceUsd);

  return (
    <article
      aria-label={`${prompt.title} by ${prompt.creator ?? "an unknown creator"}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow focus-within:shadow-md hover:shadow-md"
    >
      <PromptPreview
        src={prompt.previewMedia}
        title={prompt.title}
        bleed
        className="aspect-[16/10] w-full border-b border-gray-200"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-sm font-semibold break-words text-black">
            <Link
              href={`/prompts/${prompt.id}`}
              className="rounded transition-colors hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {prompt.title}
            </Link>
          </h3>
          {prompt.creator && (
            <span className="flex shrink-0 flex-col items-end gap-1">
              {/*
                The creator is an ENSv2 subname whose text record is what the 402
                actually pays, so it is identity here, not decoration.
              */}
              <span className="rounded-full border border-gray-200 px-2.5 py-0.5 font-mono text-[11px] text-gray-600">
                {prompt.creator}
              </span>
              {prompt.rating && <CreatorRating rating={prompt.rating} />}
            </span>
          )}
        </div>

        <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">{prompt.preview}</p>

        <ul className="flex flex-wrap gap-1.5">
          {prompt.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
            >
              {tag}
            </li>
          ))}
        </ul>

        {/*
          Wraps rather than squeezes. At 375px the price and the action do not
          fit on one line, and a row that refuses to wrap pushes the action off
          the card instead of under the price.
        */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          <span
            aria-label={`Price: ${price} in USDC, or ${formatHbar(prompt.priceHbar)}`}
            className="inline-flex items-baseline gap-1.5 rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white"
          >
            <UsdcMark className="h-3.5 w-3.5 self-center" />
            {price} USDC
            <span className="inline-flex items-center gap-1 font-normal text-gray-400">
              or <HbarMark className="h-3.5 w-3.5" />
              {formatHbar(prompt.priceHbar)}
            </span>
          </span>
          {owned ? (
            <CopyPromptButton id={prompt.id} title={prompt.title} />
          ) : (
            <Link
              href={`/prompts/${prompt.id}`}
              aria-label={`Unlock ${prompt.title} for ${price}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-black transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Unlock aria-hidden className="h-3.5 w-3.5" />
              Unlock
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
