"use client";

import gsap from "gsap";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NavLinks, { isActive, NAV_LINKS } from "@/components/NavLinks";
import WalletButton from "@/components/WalletButton";
import { useOnboarding } from "@/lib/useOnboarding";

/**
 * App navigation. Every item points at a surface that exists — do not add one
 * before its page does.
 *
 * The marketing site is a separate origin (apps/landingpage), so the logo
 * links out to it through NEXT_PUBLIC_LANDING_URL rather than to "/", which
 * here is only a redirect into the marketplace.
 */
const LANDING_URL = (process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const onboarding = useOnboarding();
  const pathname = usePathname();
  const bar = useRef<HTMLElement>(null);

  /**
   * Depth on scroll, and none at the top.
   *
   * A sticky bar with a permanent shadow floats over a page it is not yet
   * covering, which reads as a mistake. The shadow is what says "there is
   * content underneath me", so it arrives only once there is.
   */
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lifted: boolean | undefined;

    const onScroll = () => {
      const next = window.scrollY > 8;
      if (next === lifted) return;
      lifted = next;
      gsap.to(element, {
        boxShadow: next ? "0 1px 24px rgba(0,0,0,0.07)" : "0 1px 0 rgba(0,0,0,0)",
        backgroundColor: next ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.7)",
        duration: reduced ? 0 : 0.3,
        ease: "power2.out",
        overwrite: true,
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/*
        Sticky, because every page here is a long scroll and the nav is how you
        leave it. Translucent with a blur so cards passing underneath read as
        passing underneath rather than colliding with it.
      */}
      <nav ref={bar} className="sticky top-0 z-30 border-b border-gray-100/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href={LANDING_URL} className="flex items-center">
            <Image
              src="/logo.png"
              alt="Bajigur"
              width={64}
              height={64}
              className="h-10 w-10 sm:h-12 sm:w-12"
              priority
            />
          </a>

          <NavLinks />

          <div className="hidden items-center gap-4 md:flex">
            {onboarding.phase === "incomplete" && (
              <Link
                href="/welcome"
                className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Finish setup
              </Link>
            )}
            <WalletButton />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="md:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-200 bg-white/95 backdrop-blur-md md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    isActive(pathname, href)
                      ? "bg-black/[0.06] font-medium text-black"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  {label}
                </Link>
              ))}
              {onboarding.phase === "incomplete" && (
                <Link
                  href="/welcome"
                  onClick={() => setMenuOpen(false)}
                  className="self-start rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white"
                >
                  Finish setup
                </Link>
              )}
              <div className="border-t border-gray-200 pt-4">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
