import fs from "fs";
import path from "path";
import matter from "gray-matter";

import {
  getPublishingContentTier,
  isStageIncludedInBuild,
  normalizeStage,
  type ContentTier,
} from "@/lib/content-tier";
import { ONTOLOGY_ROOT } from "@/lib/content-paths";
import { essayNavDate } from "@/lib/essay-date";
import { splitEmbeddedJsonLd } from "@/lib/json-ld";

const EXTS = [".mdx", ".md"] as const;

export interface EssayStub {
  slug: string;
  title: string;
  order: number;
  dateMs?: number;
  dateIso?: string;
  dateLabel?: string;
}

function publicationTimeMs(data: Record<string, unknown> | null | undefined): number | null {
  if (!data) return null;
  const raw = data.publishedAt;
  if (raw == null) return null;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string") {
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function seriesNamesFromFrontmatter(data: Record<string, unknown>): string[] {
  const raw = data.series;
  if (typeof raw === "string" && raw.trim()) return [raw.trim().toLowerCase()];
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim().toLowerCase());
  }
  return [];
}

function essayStubFromFilename(filename: string): EssayStub & { _filename: string } {
  const full = path.join(ONTOLOGY_ROOT, filename);
  let order = Number.POSITIVE_INFINITY;
  let title = path.basename(filename).replace(/\.(mdx|md)$/i, "");
  let data: Record<string, unknown> = {};
  try {
    data = matter(fs.readFileSync(full, "utf8")).data as Record<string, unknown>;
    if (typeof data.order === "number") order = data.order;
    if (typeof data.title === "string" && data.title.trim()) title = data.title;
  } catch {
    /* keep defaults */
  }
  const navDate = essayNavDate(data);
  return {
    slug: essaySlugFromFile(filename, data),
    title,
    order,
    ...(navDate
      ? { dateMs: navDate.ms, dateIso: navDate.iso, dateLabel: navDate.label }
      : {}),
    _filename: filename,
  };
}

function sortEssayStubs<T extends EssayStub & { _filename: string }>(stubs: T[]): T[] {
  return [...stubs].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a._filename.localeCompare(b._filename);
  });
}

export function pickLatestEssaySlug(essays: EssayStub[]): string | null {
  if (essays.length === 0) return null;

  const withPub = essays.filter((e) => typeof e.dateMs === "number");
  if (withPub.length > 0) {
    const ranked = [...withPub].sort(
      (a, b) => b.dateMs! - a.dateMs! || a.slug.localeCompare(b.slug)
    );
    return ranked[0]!.slug;
  }

  type Ranked = EssayStub & { pub: number | null };
  const ranked: Ranked[] = essays.map((essay) => {
    const file = listFlatOntologyFilenames().find((f) => {
      const data = readFrontmatterForFilename(f);
      return essaySlugFromFile(f, data) === essay.slug;
    });
    const pub = file ? publicationTimeMs(readFrontmatterForFilename(file)) : null;
    return { ...essay, pub };
  });

  const withResolved = ranked.filter((e) => e.pub != null);
  if (withResolved.length > 0) {
    withResolved.sort((a, b) => b.pub! - a.pub! || a.slug.localeCompare(b.slug));
    return withResolved[0]!.slug;
  }

  const byOrder = [...ranked].sort((a, b) => {
    if (a.order !== b.order) return b.order - a.order;
    return a.slug.localeCompare(b.slug);
  });
  return byOrder[0]!.slug;
}

export interface EssayData {
  frontmatter: Record<string, unknown> & {
    title?: string;
    subtitle?: string;
    image?: string;
    imageAlt?: string;
    lexica?: string[];
    order?: number;
  };
  content: string;
  cartaJsonLd?: unknown[];
  _sourcePath?: string;
}

export function toSlug(filename: string): string {
  return filename
    .replace(/\.(mdx|md)$/i, "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function essaySlugFromFile(filename: string, data?: Record<string, unknown>): string {
  if (data && typeof data.slug === "string" && data.slug.trim()) {
    return toSlug(data.slug);
  }
  return toSlug(path.basename(filename));
}

function readFile(fullPath: string): EssayData {
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const { prose, graphs } = splitEmbeddedJsonLd(content);
  return {
    frontmatter: data as EssayData["frontmatter"],
    content: prose,
    ...(graphs.length ? { cartaJsonLd: graphs } : {}),
  };
}

export function readStageFromFile(fullPath: string): string {
  try {
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(raw);
    return normalizeStage((data as Record<string, unknown>).stage);
  } catch {
    return "draft";
  }
}

function readShowInTopicNavFromFile(fullPath: string): boolean {
  try {
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(raw);
    return (data as Record<string, unknown>).showInTopicNav !== false;
  } catch {
    return true;
  }
}

function listFlatOntologyFilenames(): string[] {
  const files: string[] = [];

  function walk(dir: string, relativeDir = "") {
    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relPath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;

      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relPath);
      } else if (EXTS.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
        files.push(relPath.replace(/\\/g, "/"));
      }
    }
  }

  walk(ONTOLOGY_ROOT);
  return files;
}

function readFrontmatterForFilename(filename: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(path.join(ONTOLOGY_ROOT, filename), "utf8");
    return matter(raw).data as Record<string, unknown>;
  } catch {
    return {};
  }
}

function fileBelongsToTopic(filename: string, topicPath: string | string[]): boolean {
  const targetTopicDir = Array.isArray(topicPath) ? topicPath.join("/") : topicPath;
  const cleanTarget = targetTopicDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
  const fileDir = path.dirname(filename).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
  return fileDir === cleanTarget;
}

function stagePreferenceRank(stage: string): number {
  const s = normalizeStage(stage);
  if (s === "canonical") return 4;
  if (s === "published") return 3;
  if (s === "review") return 2;
  return 1;
}

function pickPreferredOntologyFilename(
  filenames: string[],
  tier: ContentTier = getPublishingContentTier()
): string | null {
  if (filenames.length === 0) return null;
  if (filenames.length === 1) return filenames[0]!;

  const ranked = [...filenames].sort((a, b) => {
    const stageA = readStageFromFile(path.join(ONTOLOGY_ROOT, a));
    const stageB = readStageFromFile(path.join(ONTOLOGY_ROOT, b));
    const inclA = isStageIncludedInBuild(stageA, tier) ? 1 : 0;
    const inclB = isStageIncludedInBuild(stageB, tier) ? 1 : 0;
    if (inclA !== inclB) return inclB - inclA;
    const pref = stagePreferenceRank(stageB) - stagePreferenceRank(stageA);
    if (pref !== 0) return pref;
    return a.localeCompare(b);
  });
  return ranked[0]!;
}

export function getProfileData(slugPath: string | string[]): EssayData | null {
  const targetSlug = Array.isArray(slugPath) ? slugPath[slugPath.length - 1] : slugPath;
  const cleanTarget = toSlug(targetSlug);

  const matches = listFlatOntologyFilenames().filter((filename) => {
    if (toSlug(path.basename(filename)) === cleanTarget) return true;
    const data = readFrontmatterForFilename(filename);
    return typeof data.slug === "string" && toSlug(data.slug) === cleanTarget;
  });

  const matchedFile = pickPreferredOntologyFilename(matches);
  if (!matchedFile) return null;

  const found = path.join(ONTOLOGY_ROOT, matchedFile);
  try {
    const essay = readFile(found);
    if (process.env.NODE_ENV === "development") {
      return { ...essay, _sourcePath: found };
    }
    return essay;
  } catch {
    return null;
  }
}

export function isTopicFolder(topicPath: string | string[]): boolean {
  const targetDir = Array.isArray(topicPath) ? topicPath.join("/") : topicPath;
  const normalizedTarget = targetDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();

  return listFlatOntologyFilenames().some((filename) => {
    const fileDir = path.dirname(filename).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
    return fileDir === normalizedTarget;
  });
}

export function listEssays(topicPath: string | string[]): EssayStub[] {
  type Enriched = EssayStub & { _filename: string };

  const stubs: Enriched[] = listFlatOntologyFilenames()
    .filter((filename) => fileBelongsToTopic(filename, topicPath))
    .filter((filename) => readShowInTopicNavFromFile(path.join(ONTOLOGY_ROOT, filename)))
    .map((filename) => {
      const full = path.join(ONTOLOGY_ROOT, filename);
      let order = Number.POSITIVE_INFINITY;
      let title = path.basename(filename).replace(/\.(mdx|md)$/i, "");
      try {
        const { data } = matter(fs.readFileSync(full, "utf8"));
        if (typeof data.order === "number") order = data.order;
        if (typeof data.title === "string" && data.title.trim()) title = data.title;
      } catch {
        /* fall back to defaults */
      }
      return { slug: toSlug(path.basename(filename)), title, order, _filename: filename };
    });

  stubs.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a._filename.localeCompare(b._filename);
  });

  return stubs.map(({ _filename, ...rest }) => rest);
}

export function listEssaysForBuild(
  topicPath: string | string[],
  tier: ContentTier = getPublishingContentTier()
): EssayStub[] {
  if (tier === "local") return listEssays(topicPath);

  type Enriched = EssayStub & { _filename: string };

  const stubs: (Enriched | null)[] = listFlatOntologyFilenames()
    .filter((filename) => fileBelongsToTopic(filename, topicPath))
    .map((filename) => {
      const full = path.join(ONTOLOGY_ROOT, filename);
      let order = Number.POSITIVE_INFINITY;
      let title = path.basename(filename).replace(/\.(mdx|md)$/i, "");
      const stage = readStageFromFile(full);

      if (!isStageIncludedInBuild(stage, tier)) return null;
      if (!readShowInTopicNavFromFile(full)) return null;
      try {
        const { data } = matter(fs.readFileSync(full, "utf8"));
        if (typeof data.order === "number") order = data.order;
        if (typeof data.title === "string" && data.title.trim()) title = data.title;
      } catch {
        /* keep defaults */
      }
      return { slug: toSlug(path.basename(filename)), title, order, _filename: filename };
    });

  const filtered = stubs.filter((s): s is Enriched => s != null);
  filtered.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a._filename.localeCompare(b._filename);
  });

  return filtered.map(({ _filename, ...rest }) => rest);
}

export function getEssayInTopic(topicPath: string | string[], essaySlug: string): EssayData | null {
  const cleanSlug = toSlug(essaySlug);

  const match = listFlatOntologyFilenames().find((filename) => {
    const data = readFrontmatterForFilename(filename);
    if (essaySlugFromFile(filename, data) !== cleanSlug) return false;
    return fileBelongsToTopic(filename, topicPath);
  });

  if (!match) return null;

  try {
    const full = path.join(ONTOLOGY_ROOT, match);
    const essay = readFile(full);
    if (process.env.NODE_ENV === "development") {
      return { ...essay, _sourcePath: full };
    }
    return essay;
  } catch {
    return null;
  }
}

export function listEssaysInTopicFolder(
  topicPath: string | string[],
  options: { series?: string } = {}
): EssayStub[] {
  const seriesTarget = options.series?.trim().toLowerCase();
  const stubs = listFlatOntologyFilenames()
    .filter((filename) => {
      if (!fileBelongsToTopic(filename, topicPath)) return false;
      const data = readFrontmatterForFilename(filename);
      if (data.type === "series-summary") return false;
      if (seriesTarget && !seriesNamesFromFrontmatter(data).includes(seriesTarget)) return false;
      return true;
    })
    .map((filename) => essayStubFromFilename(filename));

  return sortEssayStubs(stubs).map(({ _filename, ...rest }) => rest);
}

export function listEssaysInTopicFolderForBuild(
  topicPath: string | string[],
  options: { series?: string; tier?: ContentTier } = {}
): EssayStub[] {
  const tier = options.tier ?? getPublishingContentTier();
  const seriesTarget = options.series?.trim().toLowerCase();

  if (tier === "local" && !seriesTarget) {
    return listEssaysInTopicFolder(topicPath, options);
  }

  const stubs = listFlatOntologyFilenames()
    .filter((filename) => {
      if (!fileBelongsToTopic(filename, topicPath)) return false;
      const full = path.join(ONTOLOGY_ROOT, filename);
      if (!isStageIncludedInBuild(readStageFromFile(full), tier)) return false;
      const data = readFrontmatterForFilename(filename);
      if (data.type === "series-summary") return false;
      if (seriesTarget && !seriesNamesFromFrontmatter(data).includes(seriesTarget)) return false;
      return true;
    })
    .map((filename) => essayStubFromFilename(filename));

  return sortEssayStubs(stubs).map(({ _filename, ...rest }) => rest);
}

export function listEssaysBySeries(seriesName: string): EssayStub[] {
  const target = seriesName.trim().toLowerCase();
  const stubs = listFlatOntologyFilenames()
    .filter((filename) => {
      const data = readFrontmatterForFilename(filename);
      if (data.type === "series-summary") return false;
      return seriesNamesFromFrontmatter(data).includes(target);
    })
    .map((filename) => essayStubFromFilename(filename));

  return sortEssayStubs(stubs).map(({ _filename, ...rest }) => rest);
}

export function listEssaysBySeriesForBuild(
  seriesName: string,
  tier: ContentTier = getPublishingContentTier()
): EssayStub[] {
  if (tier === "local") return listEssaysBySeries(seriesName);

  const target = seriesName.trim().toLowerCase();
  const stubs = listFlatOntologyFilenames()
    .filter((filename) => {
      const full = path.join(ONTOLOGY_ROOT, filename);
      if (!isStageIncludedInBuild(readStageFromFile(full), tier)) return false;
      const data = readFrontmatterForFilename(filename);
      if (data.type === "series-summary") return false;
      return seriesNamesFromFrontmatter(data).includes(target);
    })
    .map((filename) => essayStubFromFilename(filename));

  return sortEssayStubs(stubs).map(({ _filename, ...rest }) => rest);
}

export function resolveOntologyFilePath(relFromOntology: string): string | null {
  const rel = relFromOntology.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!rel) return null;

  const pathSegments = rel.split("/");
  const targetSlug = pathSegments.pop()!;

  const matchedFile = listFlatOntologyFilenames().find((filename) => {
    if (toSlug(path.basename(filename)) !== toSlug(targetSlug)) return false;
    if (pathSegments.length > 0) {
      const fileDir = path.dirname(filename).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
      return fileDir === pathSegments.join("/");
    }
    return true;
  });

  return matchedFile ? path.join(ONTOLOGY_ROOT, matchedFile) : null;
}

export function listStaticOntologySlugParams(): { slug: string[] }[] {
  const seen = new Set<string>();
  const out: { slug: string[] }[] = [];

  const add = (slug: string[]) => {
    if (slug.length < 2) return;
    const k = slug.join("/");
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ slug });
  };

  for (const filename of listFlatOntologyFilenames()) {
    const fullPath = path.join(ONTOLOGY_ROOT, filename);
    if (!isStageIncludedInBuild(readStageFromFile(fullPath), getPublishingContentTier())) {
      continue;
    }

    const fileSegments = filename.split("/");
    if (fileSegments.length >= 2) {
      const fileSlug = toSlug(fileSegments.pop()!);
      add([...fileSegments, fileSlug]);
      add(fileSegments);
    }
  }

  return out;
}
