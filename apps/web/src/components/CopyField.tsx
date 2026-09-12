"use client";

import CopyButton from "@/components/CopyButton";

/**
 * A labelled value with a copy control.
 *
 * Addresses and account ids are made to be pasted somewhere else, so the copy
 * control sits with the value rather than hiding behind a click on the text.
 */
export default function CopyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null | undefined;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-gray-200 p-4">
      <span className="text-xs text-gray-500">{label}</span>
      {value ? (
        <div className="flex items-center justify-between gap-3">
          {/*
            `min-w-0` is what makes `truncate` work here. A flex item defaults
            to min-width:auto, which is its content, so a 42-character address
            refuses to shrink: it pushed the card past the screen and took the
            whole page's horizontal scroll with it.
          */}
          <code className="min-w-0 truncate font-mono text-sm text-black">{value}</code>
          <span className="shrink-0">
            <CopyButton text={value} label={label} />
          </span>
        </div>
      ) : (
        <span className="text-sm text-gray-400">Not available yet</span>
      )}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}
