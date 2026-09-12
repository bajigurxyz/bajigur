/**
 * Official token marks, served from public/.
 *
 * These replace hand drawn approximations. A currency's logo is the one thing
 * on a price that must not be improvised: a wrong mark next to a balance reads
 * as a different asset.
 *
 * Plain <img> rather than next/image: next/image refuses SVG unless the app
 * turns on dangerouslyAllowSVG globally, and optimizing a 16px local icon buys
 * nothing. The rule these suppress exists for large remote images.
 */

type MarkProps = { className?: string };

export function UsdcMark({ className = "h-4 w-4" }: MarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static icon, see above
    <img src="/usdc.svg" alt="" aria-hidden width={16} height={16} className={className} />
  );
}

export function HbarMark({ className = "h-4 w-4" }: MarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static icon, see above
    <img src="/hbar.svg" alt="" aria-hidden width={16} height={16} className={className} />
  );
}
