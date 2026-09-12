"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import PromptPreview from "@/components/PromptPreview";
import { HbarMark, UsdcMark } from "@/components/TokenMark";

type Step = "idle" | "publishing" | "error";

/** Mirrors the API's own rules, so a mistake is caught before a round trip. */
const LIMITS = {
  title: [3, 120],
  preview: [20, 500],
  body: [50, 100_000],
} as const;

const TAG = /^[a-z0-9-]{2,24}$/;

const field =
  "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-black">{children}</span>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </span>
  );
}

/**
 * The form a creator publishes through.
 *
 * Two prices, not one converted from the other. The 402 offers both assets and
 * the buyer pays in whichever they hold, so the creator says what the prompt is
 * worth in each rather than being quoted a rate that will have moved by the
 * time anyone buys.
 *
 * Prices stay strings the whole way down. `0.1` USDC is not representable in
 * binary, and a payment one atomic unit off is refused outright.
 *
 * Nothing here decides who gets paid. `payTo` comes from the agent token at the
 * API, so this form cannot publish a prompt that pays somebody else even if it
 * tried.
 */
export default function PublishPrompt({ onPublished }: { onPublished: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    preview: "",
    body: "",
    tags: "",
    priceUsd: "",
    priceHbar: "",
    previewMedia: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const tags = form.tags
    .split(/[,\s]+/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const badTags = tags.filter((tag) => !TAG.test(tag));

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (badTags.length > 0) {
      setStep("error");
      setMessage(`These tags are not usable: ${badTags.join(", ")}. Use a-z, 0-9 and hyphens.`);
      return;
    }
    setStep("publishing");
    setMessage("");
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(data.error ?? `publishing failed (${res.status})`);
      setForm({
        title: "",
        preview: "",
        body: "",
        tags: "",
        priceUsd: "",
        priceHbar: "",
        previewMedia: "",
      });
      setOpen(false);
      setStep("idle");
      onPublished();
    } catch (err) {
      setStep("error");
      setMessage(err instanceof Error ? err.message : "Publishing failed.");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Plus aria-hidden className="h-4 w-4" />
        Publish a prompt
      </button>
    );
  }

  return (
    <form
      onSubmit={publish}
      // Centred and narrow. A form is read one field at a time, and stretched
      // across the marketplace's three-column width its labels drift far from
      // their inputs.
      className="mx-auto w-full max-w-2xl space-y-5 rounded-2xl border border-gray-200 p-5 sm:p-6"
    >
      <label className="block space-y-1.5">
        <Label hint={`${form.title.length}/${LIMITS.title[1]}`}>Title</Label>
        <input
          required
          minLength={LIMITS.title[0]}
          maxLength={LIMITS.title[1]}
          value={form.title}
          onChange={(e) => set("title")(e.target.value)}
          placeholder="Cinematic scroll-scrubbed landing page"
          className={field}
        />
      </label>

      <label className="block space-y-1.5">
        <Label hint={`${form.preview.length}/${LIMITS.preview[1]}`}>
          Preview, shown before anyone pays
        </Label>
        <textarea
          required
          rows={2}
          minLength={LIMITS.preview[0]}
          maxLength={LIMITS.preview[1]}
          value={form.preview}
          onChange={(e) => set("preview")(e.target.value)}
          placeholder="One paragraph a buyer can judge without seeing the prompt itself."
          className={field}
        />
      </label>

      <label className="block space-y-1.5">
        <Label hint={`${form.body.length} characters`}>The prompt itself</Label>
        <textarea
          required
          rows={8}
          minLength={LIMITS.body[0]}
          maxLength={LIMITS.body[1]}
          value={form.body}
          onChange={(e) => set("body")(e.target.value)}
          placeholder="The full text. Nobody sees this until they hold a licence."
          className={`${field} font-mono text-xs`}
        />
        <span className="block text-xs text-gray-500">
          Hashed onchain when you publish, so a buyer can prove the text they received is the text
          you sold.
        </span>
      </label>

      <label className="block space-y-1.5">
        <Label hint="optional">Preview recording</Label>
        <input
          type="url"
          value={form.previewMedia}
          onChange={(e) => set("previewMedia")(e.target.value)}
          placeholder="https://….r2.dev/preview.mp4"
          className={field}
        />
        <span className="block text-xs text-gray-500">
          A recording or a still of what the prompt produces: mp4, webm, mov, gif, webp, png or jpg.
          It is rendered in every visitor&apos;s browser, so only allowlisted hosts are accepted.
        </span>
      </label>

      {form.previewMedia && (
        <PromptPreview
          src={form.previewMedia}
          title={form.title || "your prompt"}
          className="aspect-[16/10] w-full"
          sizes="(max-width: 768px) 100vw, 640px"
        />
      )}

      <label className="block space-y-1.5">
        <Label hint="lowercase, comma separated, up to 12">Tags</Label>
        <input
          value={form.tags}
          onChange={(e) => set("tags")(e.target.value)}
          placeholder="landing, hero, react"
          className={field}
        />
        {badTags.length > 0 && (
          <span className="block text-xs text-red-700">
            Not usable: {badTags.join(", ")}. Use a-z, 0-9 and hyphens, 2 to 24 characters.
          </span>
        )}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <Label>
            <span className="inline-flex items-center gap-1.5">
              <UsdcMark className="h-4 w-4" />
              Price in USDC
            </span>
          </Label>
          <input
            required
            inputMode="decimal"
            pattern="\d+(\.\d{1,6})?"
            value={form.priceUsd}
            onChange={(e) => set("priceUsd")(e.target.value)}
            placeholder="0.20"
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <Label>
            <span className="inline-flex items-center gap-1.5">
              <HbarMark className="h-4 w-4" />
              Price in HBAR
            </span>
          </Label>
          <input
            required
            inputMode="decimal"
            pattern="\d+(\.\d{1,8})?"
            value={form.priceHbar}
            onChange={(e) => set("priceHbar")(e.target.value)}
            placeholder="2"
            className={field}
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">
        A buyer pays whichever of the two their wallet holds, so set both to what the prompt is
        worth rather than converting one into the other.
      </p>

      {step === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          {message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={step === "publishing"}
          className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
        >
          {step === "publishing" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {step === "publishing" ? "Registering onchain…" : "Publish"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
