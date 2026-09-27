import type { MetadataRoute } from "next";

import { SiteIdentity } from "@/config/site";
import { withBasePath } from "@/lib/base-path";

export const dynamic = "force-static";

function iconUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || SiteIdentity.url;
  const origin = raw.replace(/\/$/, "");
  return `${origin}${withBasePath("/visuals/icon.png")}`;
}

export default function manifest(): MetadataRoute.Manifest {
  const src = iconUrl();
  return {
    name: SiteIdentity.name,
    short_name: SiteIdentity.shortName,
    description: SiteIdentity.description,
    start_url: withBasePath("/"),
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "any",
    icons: [
      { src, sizes: "any", type: "image/png" },
      { src, sizes: "192x192", type: "image/png" },
      { src, sizes: "512x512", type: "image/png" },
    ],
  };
}
