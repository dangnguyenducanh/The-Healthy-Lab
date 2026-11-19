import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import "@/styles/kit/system.css";
import "@/styles/kit/layout.css";
import "@/styles/kit/motion.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { SITE } from "@/lib/site";

const display = Source_Serif_4({ subsets: ["latin"], variable: "--ff-display", display: "swap" });
const text = Libre_Franklin({ subsets: ["latin"], variable: "--ff-text", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: `${SITE.name}: healthy kitchen on ${SITE.street}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  other: { "page-type": "place", "site-kind": "other", "page-kind": "place" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f7f3ec" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request makes every page render per request, which is what lets Next.js stamp the
  // nonce from proxy.ts on its scripts (a prerendered page would carry none and the CSP would block it).
  await headers();
  return (
    <html lang="en" data-type="place" data-radius="soft" data-buttons="block" data-motion="" className={`${display.variable} ${text.variable}`}>
      <body>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
