"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * Every nav item points at a surface that actually exists. Do not add an item
 * here before its page does — a control that does nothing is an empty promise.
 *
 * The gallery, creator and earnings surfaces live in apps/web, which is a
 * separate origin in development and deployment, so these are absolute URLs
 * built from NEXT_PUBLIC_APP_URL rather than Next routes.
 */
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Gallery", href: `${APP_URL}/prompts` },
  { label: "For Creators", href: `${APP_URL}/list` },
  { label: "Earnings", href: `${APP_URL}/earnings` },
];

const SELL_URL = `${APP_URL}/list`;

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        className="animate-fade-in-up relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"
        style={{ animationDelay: "0.1s", opacity: 0 }}
      >
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Bajigur"
            width={64}
            height={64}
            className="h-12 w-12 sm:h-14 sm:w-14"
            priority
          />
        </Link>

        <div className="hidden gap-8 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-1 text-sm text-gray-700 transition-colors hover:text-black"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href={SELL_URL}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Start selling
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="sm:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="animate-fade-in-overlay absolute inset-x-0 top-[60px] z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
          <div className="flex flex-col gap-4 px-6 py-4">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1 text-left text-sm text-gray-700 transition-colors hover:text-black"
              >
                {label}
              </Link>
            ))}
            <div className="flex flex-col gap-4 border-t border-gray-200 pt-4">
              <Link
                href={SELL_URL}
                onClick={() => setMenuOpen(false)}
                className="w-full rounded-full bg-black px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                Start selling
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
