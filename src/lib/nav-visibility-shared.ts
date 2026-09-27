import { BentoRegistry } from "@/config/site";

export type BentoKey = keyof typeof BentoRegistry;

export type NavSiblingItem = { name: string; href: string; isNew?: boolean };

export type NavVisibilityPayload = Record<BentoKey, NavSiblingItem[]>;

export function resolveBentoKeyFromPathname(pathname: string): BentoKey {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/tannery")) return "B2";
  if (p.startsWith("/notes")) return "B3";
  return "B1";
}
