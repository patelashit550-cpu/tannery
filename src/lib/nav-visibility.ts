import fs from "fs";
import matter from "gray-matter";

import { BentoRegistry } from "@/config/site";
import { BENTO_ROUTE_ONTOLOGY } from "@/lib/content-paths";
import { CONTENT_HUBS, type ContentHubKey } from "@/lib/content-routes";
import { isNavSeriesItemVisible, getContentBuildTier, type ContentTier } from "@/lib/content-tier";
import {
  getEssayInTopic,
  getProfileData,
  listEssays,
  listEssaysBySeries,
  listEssaysInTopicFolder,
  resolveOntologyFilePath,
} from "@/lib/markdown";
import type { BentoKey, NavSiblingItem, NavVisibilityPayload } from "@/lib/nav-visibility-shared";

export type { BentoKey, NavSiblingItem, NavVisibilityPayload } from "@/lib/nav-visibility-shared";

function hrefToRelOntology(href: string): string {
  let rel = href.replace(/^\//, "");
  if (rel in BENTO_ROUTE_ONTOLOGY) {
    rel = BENTO_ROUTE_ONTOLOGY[rel]!;
  }
  return rel;
}

function tryReadFrontmatter(fp: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(fp, "utf8");
    return matter(raw).data as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readNavGateFrontmatter(relFromOntology: string): Record<string, unknown> | null {
  const single = resolveOntologyFilePath(relFromOntology);
  if (single) return tryReadFrontmatter(single);

  const parts = relFromOntology.split("/").filter(Boolean);
  for (let depth = parts.length; depth >= 1; depth--) {
    const topicParts = parts.slice(0, depth);
    const essays = listEssays(topicParts);
    if (essays.length === 0) continue;

    const essay = getEssayInTopic(topicParts, essays[0]!.slug);
    if (!essay) continue;
    return essay.frontmatter as Record<string, unknown>;
  }

  return null;
}

const NEW_HIGHLIGHT_DAYS = 14;

function getPublicationTimeMs(data: Record<string, unknown> | null): number | null {
  if (!data) return null;
  const rawPublished = data.publishedAt ?? data.date;
  if (rawPublished == null) return null;
  if (rawPublished instanceof Date) return rawPublished.getTime();
  if (typeof rawPublished === "number" && !Number.isNaN(rawPublished)) return rawPublished;
  if (typeof rawPublished === "string") {
    const t = Date.parse(rawPublished);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function isWithinNewHighlightWindow(data: Record<string, unknown> | null, days: number): boolean {
  const t = getPublicationTimeMs(data);
  if (t == null) return false;
  const ageMs = Date.now() - t;
  if (ageMs < 0) return false;
  return ageMs < days * 24 * 60 * 60 * 1000;
}

function frontmatterForEssaySlug(
  slug: string,
  topicPath?: readonly string[]
): Record<string, unknown> | null {
  if (topicPath?.length) {
    const inTopic = getEssayInTopic([...topicPath], slug);
    if (inTopic) return inTopic.frontmatter as Record<string, unknown>;
  }
  const profile = getProfileData([slug]);
  return profile ? (profile.frontmatter as Record<string, unknown>) : null;
}

function isHrefNew(href: string, relFromOntology: string): boolean {
  const hubKey = href.replace(/^\//, "") as ContentHubKey;
  if (hubKey in CONTENT_HUBS) {
    const config = CONTENT_HUBS[hubKey];
    const stubs =
      config.mode === "folder"
        ? listEssaysInTopicFolder([...config.ontologyTopicPath], { series: config.seriesSlug })
        : listEssaysBySeries(config.seriesName);

    return stubs.some((stub) => {
      const topicPath = config.mode === "folder" ? config.ontologyTopicPath : undefined;
      const fm = frontmatterForEssaySlug(stub.slug, topicPath);
      return isWithinNewHighlightWindow(fm, NEW_HIGHLIGHT_DAYS);
    });
  }

  return isWithinNewHighlightWindow(readNavGateFrontmatter(relFromOntology), NEW_HIGHLIGHT_DAYS);
}

function filterSeries(bentoKey: BentoKey, tier: ContentTier): NavSiblingItem[] {
  const section = BentoRegistry[bentoKey];
  const out: NavSiblingItem[] = [];
  for (const item of section.series) {
    const href = item.href as string;
    const rel = hrefToRelOntology(href);
    const data = readNavGateFrontmatter(rel);
    if (!isNavSeriesItemVisible(bentoKey, data, tier)) continue;
    out.push({
      name: item.name,
      href,
      isNew: isHrefNew(href, rel),
    });
  }
  return out;
}

let _navVisibilityMemo: NavVisibilityPayload | undefined;

export function getNavVisibilityPayload(): NavVisibilityPayload {
  const tier = getContentBuildTier();
  if (process.env.NODE_ENV === "development") {
    return {
      B1: filterSeries("B1", tier),
      B2: filterSeries("B2", tier),
      B3: filterSeries("B3", tier),
    };
  }
  if (_navVisibilityMemo) return _navVisibilityMemo;
  _navVisibilityMemo = {
    B1: filterSeries("B1", tier),
    B2: filterSeries("B2", tier),
    B3: filterSeries("B3", tier),
  };
  return _navVisibilityMemo;
}
