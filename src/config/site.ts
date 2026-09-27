import { withBasePath } from "@/lib/base-path";

export const DEFAULT_SITE_URL = "https://example.com";

export const SiteIdentity = {
  name: "Skin in the Game (Tannery)",
  shortName: "Tannery",
  description: "REPLACE_ME — your tagline",
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL,
  icon: withBasePath("/visuals/icon.png"),
};

export const LayoutConfig = {
  contentShellMaxWidth: "max-w-6xl",
  mobileShellWidth: "w-full",
  textWrappingClasses: "break-words whitespace-normal overflow-wrap-anywhere",
};

export type BentoSeriesItem = {
  name: string;
  desc: string;
  dataPoint: string;
  href: string;
};

export type BentoSectionConfig = {
  title: string;
  label: string;
  nodeKicker: string;
  subtitle: string;
  status: string;
  requiresAuth: boolean;
  series: BentoSeriesItem[];
  titleVisualSrc?: string;
  titleVisualAlt?: string;
};

/**
 * Home bento + reading-header sibling map.
 * Point `href` at ontology-backed routes (`/topic/slug`).
 */
export const BentoRegistry: Record<"B1" | "B2" | "B3", BentoSectionConfig> = {
  B1: {
    title: "Hide",
    label: "Hide",
    nodeKicker: "σκῦτος",
    subtitle: "REPLACE_ME — about",
    status: "NODE_ACTIVE // 001",
    requiresAuth: false,
    series: [
      { name: "About", desc: "What this site is", dataPoint: "0xA1", href: "/hide/about" },
    ],
  },
  B2: {
    title: "Tannery",
    label: "Tannery",
    nodeKicker: "βυρσοδεψεῖον",
    subtitle: "REPLACE_ME — essays",
    status: "NODE_STABLE // 002",
    requiresAuth: false,
    series: [
      { name: "Essays", desc: "Working notes", dataPoint: "0xB1", href: "/tannery/essays" },
    ],
  },
  B3: {
    title: "Notes",
    label: "Notes",
    nodeKicker: "δέλτος",
    subtitle: "REPLACE_ME — ledger",
    status: "SIGNAL_LIVE // 003",
    requiresAuth: false,
    series: [
      { name: "Ledger", desc: "Sample dispatch", dataPoint: "0xC1", href: "/notes/ledger" },
    ],
  },
};
