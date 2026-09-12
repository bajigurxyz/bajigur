"use client";

/**
 * Tag pills over the catalogue. The list is derived from the catalogue itself
 * rather than hardcoded, so a new tag on the API shows up here without a
 * deploy — and no pill ever renders with nothing behind it.
 */
export default function TagFilter({
  tags,
  selected,
  onSelect,
}: {
  tags: string[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}) {
  const pill = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none ${
      active
        ? "border-black bg-black text-white"
        : "border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:text-black"
    }`;

  return (
    <div role="group" aria-label="Filter prompts by tag" className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
        className={pill(selected === null)}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          aria-pressed={selected === tag}
          onClick={() => onSelect(selected === tag ? null : tag)}
          className={pill(selected === tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
