"use client";

import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Marketplace", href: "/prompts" },
  { label: "My prompts", href: "/my-prompts" },
  { label: "Profile", href: "/profile" },
];

/** `/prompts` should stay lit on `/prompts/some-id`, but `/` must not light everything. */
export const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The desktop nav, with a pill that slides to whichever page you are on.
 *
 * One pill that moves beats three that fade: the movement is what tells you
 * where you came from, and it survives a page change because the element is
 * never unmounted, only measured again.
 *
 * Measured rather than calculated. Label widths depend on the font, and a font
 * that loads late would leave a pill sized for the fallback. `useLayoutEffect`
 * is deliberately not used: this runs after paint, so the first frame is the
 * server's markup rather than a flash of an unpositioned pill.
 */
export default function NavLinks() {
  const pathname = usePathname();
  const pill = useRef<HTMLSpanElement>(null);
  const items = useRef<Record<string, HTMLAnchorElement | null>>({});
  const placed = useRef(false);

  useEffect(() => {
    const active = NAV_LINKS.find((link) => isActive(pathname, link.href));
    const element = active ? items.current[active.href] : undefined;
    const target = pill.current;
    if (!target) return;

    if (!element) {
      gsap.to(target, { autoAlpha: 0, duration: 0.2, overwrite: true });
      placed.current = false;
      return;
    }

    const box = { x: element.offsetLeft, width: element.offsetWidth };
    // The first placement jumps: there is nothing to travel from, and animating
    // in from x=0 would look like the pill flying in from the logo.
    const duration = placed.current && !reducedMotion() ? 0.42 : 0;
    placed.current = true;

    gsap.to(target, {
      x: box.x,
      width: box.width,
      autoAlpha: 1,
      duration,
      ease: "power3.out",
      overwrite: true,
    });
  }, [pathname]);

  return (
    <div className="relative hidden items-center gap-1 md:flex">
      <span
        aria-hidden
        ref={pill}
        className="absolute top-0 bottom-0 left-0 rounded-full bg-black/[0.06]"
        style={{ opacity: 0, width: 0 }}
      />
      {NAV_LINKS.map(({ label, href }) => (
        <Link
          key={label}
          href={href}
          ref={(node) => {
            items.current[href] = node;
          }}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
            isActive(pathname, href) ? "font-medium text-black" : "text-gray-600 hover:text-black"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
