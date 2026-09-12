/**
 * Token marks drawn inline rather than fetched.
 *
 * They appear next to every price and balance, so a network request per card
 * would be the slowest thing on the page, and an external image would be one
 * more thing that can 404 in a demo.
 */

const USDC_BLUE = "#2775CA";

export function UsdcMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="12" fill={USDC_BLUE} />
      <path
        d="M12 4.6v1.1c2.6.3 4.5 2.1 4.5 4.3h-2.1c0-1.2-1-2.1-2.4-2.3v3.6c2.7.4 4.6 1.3 4.6 3.6 0 2.2-1.9 3.8-4.6 4.1v1.4h-1.4v-1.4c-2.8-.3-4.8-2-4.8-4.4h2.1c0 1.3 1.1 2.3 2.7 2.5v-3.8C7.9 13 6.2 12 6.2 9.9c0-2.1 1.8-3.7 4.4-4V4.6H12Zm-1.4 2.9c-1.3.2-2.2 1-2.2 2.1 0 1 .7 1.6 2.2 1.9V7.5Zm1.4 6.2v3.7c1.5-.2 2.4-1 2.4-2 0-1-.8-1.5-2.4-1.7Z"
        fill="#fff"
      />
    </svg>
  );
}

export function HbarMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="12" fill="#000" />
      {/* The Hedera mark: two uprights joined by two crossbars. */}
      <path
        d="M7.6 5.6h1.9v3.6h5v-3.6h1.9v12.8h-1.9v-3.9h-5v3.9H7.6V5.6Zm1.9 5.3v1.7h5v-1.7h-5Z"
        fill="#fff"
      />
    </svg>
  );
}
