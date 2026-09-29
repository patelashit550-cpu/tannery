import type { ReactNode } from "react";
import type { Metadata } from "next";
import ReactMarkdown, { type Components } from "react-markdown";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isStageIncludedInBuild, normalizeStage } from "@/lib/content-tier";
import { sortEssayStubsChronological } from "@/lib/essay-date";
import {
  getProfileData,
  listEssaysForBuild,
  listEssaysBySeriesForBuild,
  listEssaysInTopicFolderForBuild,
  listStaticOntologySlugParams,
  type EssayData,
  type EssayStub,
} from "@/lib/markdown";
import {
  resolveContentRoute,
  listContentHubStaticParams,
  listBentoLegacyStaticParams,
  type ContentHubRoute,
} from "@/lib/content-routes";
import { serializeJsonLd } from "@/lib/json-ld";
import { resolveContentHubEssay, resolveReadingEssay } from "@/lib/resolve-reading-essay";
import { withBasePath } from "@/lib/base-path";
import { SiteIdentity } from "@/config/site";

export async function generateStaticParams() {
  return [
    ...listContentHubStaticParams(
      (topicPath, seriesSlug) => listEssaysInTopicFolderForBuild(topicPath, { series: seriesSlug }),
      (seriesName) => listEssaysBySeriesForBuild(seriesName)
    ),
    ...listBentoLegacyStaticParams(
      () => listEssaysForBuild(["hide"]),
      (parts) => getProfileData([parts[parts.length - 1]!]),
      (stage) => isStageIncludedInBuild(normalizeStage(stage))
    ),
    ...listStaticOntologySlugParams(),
  ];
}

export const dynamicParams = false;

function frontmatterTags(fm: Record<string, unknown>): string[] {
  const raw = fm.tags;
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? [raw] : [];
  return arr
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

function publishedIso(fm: Record<string, unknown>): string | undefined {
  const raw = fm.publishedAt;
  if (raw == null) return undefined;
  if (raw instanceof Date) return raw.toISOString();
  const t = typeof raw === "number" ? raw : typeof raw === "string" ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function toAbsUrl(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  try {
    return new URL(pathOrUrl.startsWith("/") ? withBasePath(pathOrUrl) : pathOrUrl, SiteIdentity.url).toString();
  } catch {
    return undefined;
  }
}

function canonicalPath(slug: string[]): string {
  return `/${slug.filter(Boolean).join("/")}/`;
}

function plainExcerpt(markdown: string, max = 160): string | undefined {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/[>#*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max).trim()}…`;
}

function essayDescription(fm: Record<string, unknown>, content: string): string | undefined {
  if (typeof fm.subtitle === "string" && fm.subtitle.trim()) return fm.subtitle.trim();
  return plainExcerpt(content) ?? SiteIdentity.description;
}

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  if (!rawSlug) return {};

  const slug = rawSlug.filter(Boolean);
  if (slug.length < 2) return {};

  const resolved = resolveReadingEssay(slug);
  if (!resolved) return {};

  const { frontmatter, content } = resolved.essay;
  const title = typeof frontmatter.title === "string" ? frontmatter.title : undefined;
  const description = essayDescription(frontmatter, content);
  const tags = frontmatterTags(frontmatter);
  const path = canonicalPath(slug);
  const published = publishedIso(frontmatter);
  const imageAbs = toAbsUrl(typeof frontmatter.image === "string" ? frontmatter.image : undefined);
  const imageAlt =
    (typeof frontmatter.imageAlt === "string" && frontmatter.imageAlt.trim()) || title || SiteIdentity.name;
  const images = imageAbs ? [{ url: imageAbs, alt: imageAlt }] : undefined;

  return {
    title,
    description,
    keywords: tags.length ? tags : undefined,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title,
      description,
      url: path,
      siteName: SiteIdentity.name,
      publishedTime: published,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: imageAbs ? [imageAbs] : undefined,
    },
  };
}

function contentJsonLd(
  frontmatter: EssayData["frontmatter"],
  url?: string
): string {
  const tags = frontmatterTags(frontmatter);
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: frontmatter.title ?? "",
  };
  if (typeof frontmatter.subtitle === "string" && frontmatter.subtitle.trim()) {
    ld.description = frontmatter.subtitle.trim();
  }
  if (url) {
    ld.url = url;
    ld.mainEntityOfPage = url;
  }
  if (tags.length) ld.keywords = tags.join(", ");
  const published = publishedIso(frontmatter);
  if (published) {
    ld.datePublished = published;
    ld.dateModified = published;
  }
  ld.author = { "@type": "Person", name: "REPLACE_ME", url: SiteIdentity.url };
  ld.publisher = { "@type": "Organization", name: SiteIdentity.name, url: SiteIdentity.url };
  const img = toAbsUrl(typeof frontmatter.image === "string" ? frontmatter.image : undefined);
  if (img) ld.image = img;
  return serializeJsonLd(ld);
}

function assetSrc(src: string): string {
  return src.startsWith("/") ? withBasePath(src) : src;
}

/** inset | figure | plate → editorial plate (desktop split beside copy; mobile stacked) */
function isPlateImageRole(imageRole?: string): boolean {
  return imageRole === "inset" || imageRole === "figure" || imageRole === "plate";
}

function createMarkdownComponents(): Components {
  return {
    table: ({ children, ...props }) => (
      <div className="p3-table-scroll">
        <table {...props}>{children}</table>
      </div>
    ),
    img: ({ src, alt, ...props }) => {
      if (typeof src !== "string" || src.trim() === "") return null;
      return <img src={assetSrc(src)} alt={alt ?? ""} {...props} className="p3-inline-image--feature" />;
    },
  };
}

function headingText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === "string" ? c : "")).join("");
  }
  return "";
}

function headingAnchor(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function NarrativeEssayBody({
  lead,
  image,
  imageAlt,
  imageRole = "figure",
  content,
  components,
}: {
  lead?: ReactNode;
  image?: string;
  imageAlt: string;
  imageRole?: string;
  content: string;
  components: Components;
}) {
  const isPlateFigure = Boolean(image && isPlateImageRole(imageRole));
  const hasBody = Boolean(content.trim());
  if (!hasBody && !image) return null;

  const plateFigure =
    isPlateFigure && image ? (
      <figure className="p3-narrative-figure p3-narrative-figure--plate">
        <img
          src={assetSrc(image)}
          alt={imageAlt}
          loading="eager"
          className="p3-narrative-figure__img p3-narrative-figure__img--plate"
        />
      </figure>
    ) : null;

  const copyInner = content.trim() ? (
    <ReactMarkdown components={components}>{content}</ReactMarkdown>
  ) : null;

  const bodyClassName = ["p3-narrative-body", isPlateFigure ? "p3-narrative-body--with-plate" : ""]
    .filter(Boolean)
    .join(" ");

  const bodySection = hasBody ? (
    <section className={bodyClassName}>
      {isPlateFigure ? (
        <>
          <div className="p3-narrative-body__lead">
            {lead}
            {plateFigure}
          </div>
          <div className="p3-narrative-body__copy">{copyInner}</div>
        </>
      ) : (
        copyInner
      )}
    </section>
  ) : null;

  if (isPlateFigure) {
    return <div className="p3-narrative-layout">{bodySection}</div>;
  }

  return (
    <>
      {lead}
      {bodySection ? <div className="p3-narrative-layout">{bodySection}</div> : null}
    </>
  );
}

export default async function OntologyArchive({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  if (!rawSlug) return notFound();

  const slug = rawSlug.filter(Boolean);
  if (slug.length < 2) return notFound();

  const canonicalUrl = toAbsUrl(canonicalPath(slug));
  const route = resolveContentRoute(slug);
  if (!route) return notFound();

  if (route.kind === "content-hub") {
    return renderContentHub(route);
  }

  const resolved = resolveReadingEssay(slug);
  if (!resolved) return notFound();

  const essays = listEssaysForBuild(route.topicPath);
  if (essays.length > 1) {
    return (
      <TopicLayout
        topicPath={slug.slice(0, slug.length - 1)}
        essays={essays}
        activeSlug={route.activeSlug}
        activeEssay={resolved.essay}
      />
    );
  }

  return <SingleArticle data={resolved.essay} canonicalUrl={canonicalUrl} />;
}

function renderContentHub(route: ContentHubRoute) {
  const resolved = resolveContentHubEssay(route);
  if (!resolved) return notFound();

  const { config } = route;
  const essays =
    config.mode === "folder"
      ? listEssaysInTopicFolderForBuild([...config.ontologyTopicPath], {
          series: config.seriesSlug,
        })
      : listEssaysBySeriesForBuild(config.seriesName);
  const navEssays = config.navChronological ? sortEssayStubsChronological(essays) : essays;

  return (
    <TopicLayout
      topicPath={[...config.publicBase]}
      navKicker={config.navKicker}
      showNavIndex={config.sequentialNav === true}
      showNavDate={config.showNavDate === true}
      showTopicNav={config.showTopicNav !== false}
      essays={navEssays}
      activeSlug={resolved.essaySlug}
      activeEssay={resolved.essay}
    />
  );
}

function SingleArticle({ data, canonicalUrl }: { data: EssayData; canonicalUrl?: string }) {
  const { frontmatter, content, cartaJsonLd } = data;
  const image = typeof frontmatter.image === "string" ? frontmatter.image : undefined;
  const imageRole = typeof frontmatter.imageRole === "string" ? frontmatter.imageRole : "inset";
  const imageAlt = (typeof frontmatter.imageAlt === "string" && frontmatter.imageAlt) || frontmatter.title || "";

  return (
    <div className="p3-narrative-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: contentJsonLd(frontmatter, canonicalUrl) }} />
      {cartaJsonLd?.map((graph, i) => (
        <script
          key={`ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }}
        />
      ))}

      <article className="p3-narrative-article">
        <NarrativeEssayBody
          lead={
            <header className="p3-narrative-article__header">
              <h1 className="p3-narrative-article__title">{frontmatter.title}</h1>
              <span className="p3-narrative-article__rule" aria-hidden="true" />
            </header>
          }
          image={image}
          imageAlt={imageAlt}
          imageRole={imageRole}
          content={content}
          components={createMarkdownComponents()}
        />
      </article>
    </div>
  );
}

function TopicLayout({
  topicPath,
  navKicker,
  showNavIndex = false,
  showNavDate = false,
  showTopicNav = true,
  essays,
  activeSlug,
  activeEssay,
}: {
  topicPath: string[];
  navKicker?: string;
  showNavIndex?: boolean;
  showNavDate?: boolean;
  showTopicNav?: boolean;
  essays: EssayStub[];
  activeSlug: string;
  activeEssay: EssayData;
}) {
  const basePath = `/${topicPath.join("/")}`;
  const { frontmatter, content, cartaJsonLd } = activeEssay;
  const canonicalUrl = toAbsUrl(`${basePath}/${activeSlug}/`);
  const fallbackTitle = essays.find((e) => e.slug === activeSlug)?.title ?? "";
  const title = (frontmatter.title as string) || fallbackTitle;
  const subtitle =
    typeof frontmatter.subtitle === "string"
      ? frontmatter.subtitle
      : typeof frontmatter.label === "string"
        ? frontmatter.label
        : null;
  const image = typeof frontmatter.image === "string" ? frontmatter.image : undefined;
  const imageRole = typeof frontmatter.imageRole === "string" ? frontmatter.imageRole : "figure";
  const imageAlt = (typeof frontmatter.imageAlt === "string" && frontmatter.imageAlt) || title;
  const activeKickerLabel = navKicker ?? topicPath[topicPath.length - 1]?.toUpperCase() ?? "INDEX";

  return (
    <div className={["p3-topic-canvas", showTopicNav ? "" : "p3-topic-canvas--no-nav"].filter(Boolean).join(" ")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: contentJsonLd(frontmatter, canonicalUrl) }} />
      {cartaJsonLd?.map((graph, i) => (
        <script
          key={`ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }}
        />
      ))}
      {showTopicNav ? (
        <>
          <nav
            className={`p3-topic-nav${showNavIndex ? " p3-topic-nav--sequential" : ""}${showNavDate ? " p3-topic-nav--temporal" : ""}`}
            aria-label="Essays in this topic"
          >
            <div className="p3-topic-nav__sticky">
              <p className="p3-topic-nav__kicker">{activeKickerLabel}</p>
              <ul className="p3-topic-nav__list">
                {essays.map((e, index) => {
                  const isActive = e.slug === activeSlug;
                  const dateLabel = showNavDate ? e.dateLabel : undefined;
                  return (
                    <li key={e.slug}>
                      <Link
                        href={`${basePath}/${e.slug}`}
                        className={`p3-topic-nav__link${isActive ? " is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {showNavIndex && (
                          <span className="p3-topic-nav__index" aria-hidden="true">
                            {String(index + 1)}
                          </span>
                        )}
                        <span className="p3-topic-nav__label">
                          <span className="p3-topic-nav__title">{e.title}</span>
                          {dateLabel && e.dateIso && (
                            <time className="p3-topic-nav__date" dateTime={e.dateIso}>
                              {dateLabel}
                            </time>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
          <div className="p3-topic-separator" aria-hidden="true" />
        </>
      ) : null}

      <article className="p3-topic-article p3-narrative-article">
        <NarrativeEssayBody
          lead={
            <header className="p3-narrative-article__header">
              <h1 className="p3-narrative-article__title">{title}</h1>
              {subtitle && <p className="p3-topic-article__subtitle">{subtitle}</p>}
              <span className="p3-narrative-article__rule" aria-hidden="true" />
            </header>
          }
          image={image}
          imageAlt={imageAlt}
          imageRole={imageRole}
          content={content}
          components={{
            ...createMarkdownComponents(),
            h2: ({ children, ...props }) => (
              <h2 {...props} id={headingAnchor(headingText(children))}>
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 {...props} id={headingAnchor(headingText(children))}>
                {children}
              </h3>
            ),
          }}
        />
      </article>
    </div>
  );
}
