"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BentoRegistry } from "@/config/site";
import { withBasePath } from "@/lib/base-path";
import { resolveBentoKeyFromPathname } from "@/lib/nav-visibility-shared";
import { useNavVisibility } from "@/components/layout/NavVisibilityContext";
import { cn } from "@/lib/utils";

function isSiblingNavActive(pathname: string | null | undefined, href: string): boolean {
  const p = (pathname ?? "/").replace(/\/+$/, "") || "/";
  const h = href.replace(/\/+$/, "") || "/";
  return p === h || p.startsWith(`${h}/`);
}

type BentoSection = (typeof BentoRegistry)[keyof typeof BentoRegistry];

const resolveSection = (pathname: string): BentoSection => {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/tannery")) return BentoRegistry.B2;
  if (p.startsWith("/notes")) return BentoRegistry.B3;
  return BentoRegistry.B1;
};

const NarrativeHeader = () => {
  const pathname = usePathname();
  const navPayload = useNavVisibility();
  const sectionKey = resolveBentoKeyFromPathname(pathname ?? "/");
  const filtered = navPayload?.[sectionKey];
  const section = resolveSection(pathname ?? "");
  const siblingItems = (
    filtered ??
    section.series.map((item) => ({ name: item.name, href: item.href as string, isNew: false }))
  ).map((item) => ({
    name: item.name,
    href: item.href,
    isNew: item.isNew === true,
  }));

  return (
    <header className="p3-narrative-header">
      <div className="p3-narrative-inner">
        <Link href="/" className="p3-narrative-brand" aria-label="Skin in the Game — home">
          <span className="p3-narrative-brand__mark">
            <Image
              src={withBasePath("/visuals/icon.png")}
              alt=""
              aria-hidden="true"
              width={56}
              height={56}
              priority
            />
          </span>
          <span className="p3-narrative-brand__wordmark">
            <span className="p3-narrative-brand__wordmark--main">Skin in</span>
            <span className="p3-narrative-brand__wordmark--sub">the Game</span>
          </span>
        </Link>

        <nav className="p3-narrative-nav" aria-label="Section">
          {siblingItems.map((item) => {
            const isActive = isSiblingNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn("p3-narrative-link", item.isNew && "p3-narrative-link--new")}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default NarrativeHeader;
