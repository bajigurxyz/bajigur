"use client";

import { useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";

const RADIUS = 80;
const PULL = 0.3;
const MAX = 12;

/**
 * `magnetic-buttons`: the button leans toward the pointer inside an 80px
 * radius, by 30% of the offset, capped at 12px, and springs back on leave.
 *
 * Those are the prompt's own numbers. Pointer-driven, so it does nothing on
 * touch and nothing under reduced motion — exactly the carve-outs the prompt
 * asks for.
 */
export default function MagneticPreview() {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduced = usePrefersReducedMotion();

  const track = (event: React.PointerEvent) => {
    if (reduced || event.pointerType === "touch" || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    if (Math.hypot(dx, dy) > RADIUS) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    const clamp = (value: number) => Math.max(-MAX, Math.min(MAX, value * PULL));
    setOffset({ x: clamp(dx), y: clamp(dy) });
  };

  return (
    <button
      type="button"
      ref={ref}
      tabIndex={-1}
      aria-hidden
      onPointerMove={track}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      className="flex h-full w-full cursor-default items-center justify-center"
    >
      <span
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition-transform duration-300 ease-out"
      >
        Hover me
      </span>
    </button>
  );
}
