import type { EssayStub } from "@/lib/markdown";
import { BentoRegistry } from "@/config/site";

export type ContentHubKey = "tannery/essays";

type FolderHubConfig = {
  mode: "folder";
  ontologyTopicPath: readonly string[];
  seriesSlug?: string;
};

type SeriesHubConfig = {
  mode: "series";
  seriesName: string;
  landerOntologyRel: string;
};

export type ContentHubConfig = {
  publicBase: readonly string[];
  navKicker: string;
  landerSlug: string;
  hubLanding?: "latest" | "lander" | "first";
  sequentialNav?: boolean;
  showNavDate?: boolean;
  navChronological?: boolean;
  showTopicNav?: boolean;
  fitViewport?: boolean;
} & (FolderHubConfig | SeriesHubConfig);

export const CONTENT_HUBS: Record<ContentHubKey, ContentHubConfig> = {
  "tannery/essays": {
    publicBase: ["tannery", "essays"],
    navKicker: "TANNERY",
    landerSlug: "welcome",
    hubLanding: "first",
    mode: "folder",
    ontologyTopicPath: ["tannery"],
    sequentialNav: true,
  },
};

export type ContentHubRoute = {
  kind: "content-hub";
  hubKey: ContentHubKey;
  config: ContentHubConfig;
  essaySlug: string | null;
};

export type LegacyContentRoute = {
  kind: "legacy";
  topicPath: string[];
  activeSlug: string;
  isMeRoute: boolean;
};

export type ContentRoute = ContentHubRoute | LegacyContentRoute;

function hubKeyFromSlug(parts: string[]): ContentHubKey | null {
  if (parts.length < 2) return null;
  const key = `${parts[0]}/${parts[1]}` as ContentHubKey;
  return key in CONTENT_HUBS ? key : null;
}

export function resolveContentRoute(slug: string[]): ContentRoute | null {
  const parts = slug.filter(Boolean);
  if (parts.length < 2) return null;

  const hubKey = hubKeyFromSlug(parts);
  if (hubKey) {
    return {
      kind: "content-hub",
      hubKey,
      config: CONTENT_HUBS[hubKey],
      essaySlug: parts.length > 2 ? parts[2]! : null,
    };
  }

  return {
    kind: "legacy",
    topicPath: parts.slice(0, -1),
    activeSlug: parts[parts.length - 1]!,
    isMeRoute: false,
  };
}

export function listContentHubStaticParams(
  listFolderEssays: (topicPath: string[], seriesSlug?: string) => EssayStub[],
  listSeriesEssays: (seriesName: string) => EssayStub[]
): { slug: string[] }[] {
  const out: { slug: string[] }[] = [];

  for (const config of Object.values(CONTENT_HUBS)) {
    const base = [...config.publicBase];
    out.push({ slug: base });

    const essays =
      config.mode === "folder"
        ? listFolderEssays([...config.ontologyTopicPath], config.seriesSlug)
        : listSeriesEssays(config.seriesName);

    for (const essay of essays) {
      out.push({ slug: [...base, essay.slug] });
    }
  }

  return out;
}

export function listBentoLegacyStaticParams(
  _listMeEssays: () => EssayStub[],
  resolveEssay: (slugParts: string[]) => { frontmatter: Record<string, unknown> } | null,
  isStageIncluded: (stage: unknown) => boolean
): { slug: string[] }[] {
  const out: { slug: string[] }[] = [];
  const seen = new Set<string>();

  const add = (parts: string[]) => {
    const key = parts.join("/");
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ slug: parts });
  };

  for (const section of Object.values(BentoRegistry)) {
    for (const item of section.series) {
      const rel = item.href.replace(/^\//, "");
      if (rel in CONTENT_HUBS) continue;
      const parts = rel.split("/");
      const essay = resolveEssay(parts);
      if (!essay) continue;
      if (!isStageIncluded(essay.frontmatter.stage)) continue;
      add(parts);
    }
  }

  return out;
}
