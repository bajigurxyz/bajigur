import { Minus, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Prompt } from "@/lib/api";

/**
 * What buyers have said about this prompt's creator, onchain.
 *
 * Shown as a signed total and a headcount, never as stars. The ERC-8004
 * reputation registry adds signed feedback up: two buyers leaving +1 and -1 land
 * on zero, and one buyer leaving +5 outranks five buyers leaving +1 each.
 * Averaging that into a five-point scale would invent a number nobody recorded.
 *
 * Absent until somebody rates, rather than shown as zero. A creator with no
 * ratings has not been judged badly, and "0" reads like they have.
 */
export default function CreatorRating({
  rating,
  className = "",
}: {
  rating: NonNullable<Prompt["rating"]>;
  className?: string;
}) {
  const { count, score } = rating;
  const Icon = score > 0 ? ThumbsUp : score < 0 ? ThumbsDown : Minus;
  const tone =
    score > 0
      ? "border-green-200 bg-green-50 text-green-800"
      : score < 0
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span
      title="Net feedback from buyers, recorded in the ERC-8004 reputation registry on Hedera"
      aria-label={`Creator rating: net ${score > 0 ? `plus ${score}` : score} from ${count} ${
        count === 1 ? "buyer" : "buyers"
      }`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone} ${className}`}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {score > 0 ? `+${score}` : score}
      <span className="font-normal opacity-70">
        · {count} {count === 1 ? "buyer" : "buyers"}
      </span>
    </span>
  );
}
