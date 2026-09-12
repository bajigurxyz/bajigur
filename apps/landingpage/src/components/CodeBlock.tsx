import CopyButton from "@/components/CopyButton";

/**
 * A block of copyable code with its own label.
 *
 * The same shape the onboarding tabs use, so a command shown on the docs page
 * and the same command shown on the home page look and behave alike.
 */
export default function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-gray-950">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
        <span className="truncate text-xs text-gray-400">{label}</span>
        <CopyButton text={code} label={label} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed break-all whitespace-pre-wrap text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
