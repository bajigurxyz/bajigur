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
    <div className="flex flex-col gap-1.5 rounded-2xl border border-gray-200 p-4">
      <span className="text-xs text-gray-500">{label}</span>
      {value ? (
        <div className="flex items-center justify-between gap-3">
          <code className="truncate font-mono text-sm text-black">{value}</code>
          <CopyButton text={value} label={label} />
        </div>
      ) : (
        <span className="text-sm text-gray-400">Not available yet</span>
      )}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}
