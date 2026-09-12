"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import WalletButton from "@/components/WalletButton";

/**
 * App navigation. Every item points at a surface that exists — do not add one
 * before its page does.
 *
 * The marketing site is a separate origin (apps/landingpage), so the logo
 * links out to it through NEXT_PUBLIC_LANDING_URL rather than to "/", which
 * here is only a redirect into the gallery.
 */
const LANDING_URL = (process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Gallery", href: "/prompts" },
  { label: "My licences", href: "/licenses" },
  { label: "Connect", href: "/connect" },
];

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
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
          <WalletButton />
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
        <div className="absolute inset-x-0 top-[60px] z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
          <div className="flex flex-col gap-4 px-6 py-4">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="text-left text-sm text-gray-700 transition-colors hover:text-black"
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-gray-200 pt-4">
              <WalletButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
