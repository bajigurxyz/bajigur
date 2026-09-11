import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bajigur — pay per prompt, not per month",
  description:
    "A marketplace of motion and web design prompts an agent can discover, pay for, and use on its own. Settled over x402 on Hedera, straight to the creator.",
};

/**
 * Deliberately provider-free: the landing page connects no wallet and reads no
 * account, so nothing here needs wagmi or a query client (see CLAUDE.md).
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
