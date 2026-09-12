import { Github, Globe, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const REPO = "https://github.com/bajigurxyz/bajigur";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Marketplace", href: `${APP_URL}/prompts` },
      { label: "Publish a prompt", href: `${APP_URL}/welcome` },
      { label: "Your profile", href: `${APP_URL}/profile` },
      { label: "Connect an agent", href: `${APP_URL}/connect` },
    ],
  },
  {
    heading: "Protocol",
    links: [
      { label: "MCP docs", href: "/mcp" },
      { label: "x402 on Hedera", href: "https://docs.hedera.com" },
      { label: "Names under bajigur.eth", href: "https://ens.domains" },
    ],
  },
  {
    heading: "Project",
    links: [
      { label: "Source", href: REPO },
      { label: "Issues", href: `${REPO}/issues` },
      { label: "ETHOnline 2026", href: "https://ethglobal.com" },
    ],
  },
];

const SOCIALS: { label: string; href: string; Icon: typeof Github }[] = [
  { label: "Source on GitHub", href: REPO, Icon: Github },
  { label: "Bajigur on X", href: "https://x.com", Icon: Twitter },
  { label: "The app", href: APP_URL, Icon: Globe },
];

/** The layered card holding the directories. */
function FooterCard() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[#E9EBEE] shadow-sm sm:rounded-[48px]">
        <div className="m-2 rounded-[26px] bg-white shadow-sm sm:rounded-[40px]">
          <div className="grid grid-cols-1 gap-12 p-8 md:grid-cols-2 md:p-10 lg:grid-cols-5 lg:p-12">
            <div className="space-y-8 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                {/*
                  Decorative: the wordmark beside it already names the brand,
                  and a second "Bajigur" image would have a screen reader say it
                  twice. The nav logo is the one that carries the name, because
                  it is a link and an unnamed link is useless.
                */}
                <Image
                  src="/logo.png"
                  alt=""
                  aria-hidden
                  width={64}
                  height={64}
                  className="h-8 w-8 rounded-[8px]"
                />
                <span className="text-[26px] font-bold tracking-tight text-[#0F172A]">bajigur</span>
              </div>
              <p className="max-w-[320px] text-[16px] leading-relaxed font-normal text-[#64748B]">
                A marketplace of design prompts an agent can buy on its own. Paid per use on Hedera,
                straight to the creator, with no subscription in between.
              </p>
              <div className="flex gap-3">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:outline-none active:scale-95"
                  >
                    <Icon aria-hidden className="h-5 w-5 text-slate-800" />
                  </a>
                ))}
              </div>
            </div>

            {COLUMNS.map(({ heading, links }) => (
              <div key={heading} className="space-y-6">
                <h4 className="text-[14px] font-medium text-[#94A3B8]">{heading}</h4>
                <ul className="space-y-4">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-[15px] font-medium text-[#1E293B] transition-colors hover:text-[#31A8FF] focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:outline-none"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 px-6 py-5 text-[15px] sm:px-12 md:flex-row md:px-16 lg:px-20">
          <p className="font-medium text-[#64748B]">
            © {new Date().getFullYear()} Bajigur. Hedera testnet.
          </p>
          <div className="flex items-center gap-8 font-medium text-[#64748B]">
            <a
              href={`${REPO}/blob/main/README.md`}
              className="transition-colors hover:text-[#1E293B]"
            >
              How it works
            </a>
            <div aria-hidden className="h-4 w-[1px] bg-slate-300" />
            <a
              href={`${REPO}/blob/main/LICENSE`}
              className="transition-colors hover:text-[#1E293B]"
            >
              Licence
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The wordmark as a pane of glass.
 *
 * The filter is handmade rather than a blur utility: an outer drop shadow, an
 * inner white highlight and an inner black shade, merged over the source. That
 * is what reads as thickness instead of as a shadow behind flat text.
 *
 * The entrance uses the repo's own guarded animation class. Reduced motion
 * shortens it rather than cancelling it, because these elements carry an inline
 * `opacity: 0` and cancelling would leave the word invisible.
 */
function GlassWordmark() {
  return (
    <div className="relative flex w-full items-center justify-center pt-0 select-none">
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="bajigur-glass" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="6"
              floodColor="#000000"
              floodOpacity="0.25"
              result="outer-shadow"
            />
            <feComponentTransfer in="SourceAlpha" result="alpha">
              <feFuncA type="linear" slope="1" />
            </feComponentTransfer>
            <feOffset in="alpha" dx="0" dy="4" result="offset-white" />
            <feGaussianBlur in="offset-white" stdDeviation="4" result="blur-white" />
            <feComposite in="alpha" in2="blur-white" operator="out" result="inner-white-mask" />
            <feFlood floodColor="#ffffff" floodOpacity="0.25" result="white-fill" />
            <feComposite
              in="white-fill"
              in2="inner-white-mask"
              operator="in"
              result="inner-white-final"
            />
            <feGaussianBlur in="alpha" stdDeviation="6" result="blur-black" />
            <feComposite in="alpha" in2="blur-black" operator="out" result="inner-black-mask" />
            <feFlood floodColor="#000000" floodOpacity="0.25" result="black-fill" />
            <feComposite
              in="black-fill"
              in2="inner-black-mask"
              operator="in"
              result="inner-black-final"
            />
            <feMerge>
              <feMergeNode in="outer-shadow" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="inner-white-final" />
              <feMergeNode in="inner-black-final" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <p
        aria-hidden
        className="animate-fade-in-up px-4 text-[min(25vw,400px)] leading-none font-bold tracking-normal text-white select-none"
        style={{ filter: "url(#bajigur-glass)", animationDelay: "0.1s", opacity: 0 }}
      >
        bajigur
      </p>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="flex w-full flex-col items-center gap-0 overflow-hidden bg-[#F0F1F3] px-4 pt-16 pb-0">
      <FooterCard />
      <GlassWordmark />
    </footer>
  );
}
