import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { NavVisibilityProvider } from "@/components/layout/NavVisibilityContext";
import { getNavVisibilityPayload } from "@/lib/nav-visibility";
import { SiteIdentity } from "@/config/site";
import { withBasePath } from "@/lib/base-path";

function metadataBaseUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || SiteIdentity.url;
  try {
    return new URL(raw.endsWith("/") ? raw : `${raw}/`);
  } catch {
    return new URL("https://example.com/");
  }
}

const inter = localFont({
  src: [
    { path: "../../public/fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/Inter-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export function generateMetadata(): Metadata {
  return {
    metadataBase: metadataBaseUrl(),
    title: SiteIdentity.name,
    description: SiteIdentity.description,
    icons: {
      icon: [{ url: withBasePath("/visuals/icon.png"), type: "image/png" }],
      shortcut: withBasePath("/visuals/icon.png"),
      apple: withBasePath("/visuals/icon.png"),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navVisibility = getNavVisibilityPayload();

  return (
    <html lang="en" className={`bg-white ${inter.variable}`}>
      <body className={`${inter.className} bg-white text-neutral-950 antialiased`}>
        <NavVisibilityProvider value={navVisibility}>{children}</NavVisibilityProvider>
      </body>
    </html>
  );
}
