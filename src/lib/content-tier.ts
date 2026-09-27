/**
 * Content gating tiers:
 *
 * - **local:** `next dev` default — all `stage` values, drafts in nav/menus/routes.
 * - **preprod:** `NEXT_PUBLIC_CONTENT_TIER=preprod` on `next build` — `review` /
 *   `published` / `canonical` only (`draft` stays local-only).
 * - **global:** public surfaces — only `published` / `canonical` in export and menus.
 *
 * Set `NEXT_PUBLIC_CONTENT_TIER` to `local` | `preprod` | `global`. Legacy: `dev` → local,
 * `prod` → global; `staging` → preprod (`qa` stays **local**).
 *
 * When unset: `next dev` → local; `next build` → global (published only).
 */
export type ContentTier = "local" | "preprod" | "global";

const CANON = /^(local|preprod|global)$/i;
const LEGACY: Record<string, ContentTier> = {
  dev: "local",
  prod: "global",
  qa: "local",
  staging: "preprod",
};

export function getContentBuildTier(): ContentTier {
  const raw = process.env.NEXT_PUBLIC_CONTENT_TIER?.trim();
  if (raw) {
    const k = raw.toLowerCase();
    if (CANON.test(k)) {
      return k as ContentTier;
    }
    if (k in LEGACY) {
      return LEGACY[k]!;
    }
  }
  if (process.env.NODE_ENV === "development") {
    return "local";
  }
  return "global";
}

export function getPublishingContentTier(): ContentTier {
  if (process.env.NODE_ENV === "production") {
    const tier = getContentBuildTier();
    return tier === "preprod" ? "preprod" : "global";
  }
  return getContentBuildTier();
}

/** Normalize frontmatter: missing or invalid → `draft` (strict global hides). */
export function normalizeStage(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().toLowerCase();
  }
  return "draft";
}

export function isStageIncludedInBuild(
  stage: string,
  tier: ContentTier = getPublishingContentTier()
): boolean {
  const s = normalizeStage(stage);
  if (tier === "global") {
    return s === "published" || s === "canonical";
  }
  if (tier === "preprod") {
    return s === "review" || s === "published" || s === "canonical";
  }
  return true;
}

export function isNavSeriesItemVisible(
  _bentoKey: "B1" | "B2" | "B3",
  data: Record<string, unknown> | null,
  tier: ContentTier = getContentBuildTier()
): boolean {
  if (!data) return false;
  if (data.showInNav === true && tier !== "global") return true;
  const stage = normalizeStage(data.stage);
  return isStageIncludedInBuild(stage, tier);
}
