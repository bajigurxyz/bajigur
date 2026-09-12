import Image from "next/image";
import Link from "next/link";

/**
 * The landing header carries the logo and pages of this site, nothing more.
 *
 * Gallery, licences and connecting a wallet are surfaces inside apps/web. Put
 * them here and the marketing page starts impersonating the app: links that
 * leave the site, most of them useless to someone who has not signed in yet.
 * The hero's own call to action is the way in.
 *
 * The MCP docs are the exception that proves the rule: same origin, and useful
 * to a visitor who has never signed in, which is exactly who reads them.
 *
 * With no menu there is no state, so this stays a server component.
 */
export default function Nav() {
  return (
    <nav
      className="animate-fade-in-up relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"
      style={{ animationDelay: "0.1s", opacity: 0 }}
    >
      {/* Dark mark on a light surface. On a dark surface use the white
          variant, never black on black. */}
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

      <Link
        href="/mcp"
        className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-700 transition-colors hover:border-black hover:text-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        MCP docs
      </Link>
    </nav>
  );
}
