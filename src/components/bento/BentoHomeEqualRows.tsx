"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";

import { BentoCard } from "./BentoCard";
import { BentoRegistry } from "@/config/site";
import type { BentoKey, NavVisibilityPayload } from "@/lib/nav-visibility-shared";
import { cn } from "@/lib/utils";

const MD_MIN = 768;
const WIDE_MQ = `(min-width: ${MD_MIN}px)`;
const MIN_ROW_PX = 180;

function getLandingBottomPadPx(): number {
  const home = document.querySelector(".p3-landing-home");
  if (!home) return 48;
  const pad = parseFloat(getComputedStyle(home).paddingBottom);
  return Number.isFinite(pad) && pad > 0 ? pad : 48;
}

function getAvailableRowHeight(): number {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;
  const header = document.querySelector(".p3-landing-hero");
  const viewportH = window.visualViewport?.height ?? window.innerHeight;
  const top = header?.getBoundingClientRect().bottom ?? 0;
  return Math.max(0, Math.floor(viewportH - top - getLandingBottomPadPx()));
}

function subscribeWideMq(onStoreChange: () => void): () => void {
  const m = window.matchMedia(WIDE_MQ);
  m.addEventListener("change", onStoreChange);
  return () => m.removeEventListener("change", onStoreChange);
}

function getWideMqSnapshot(): boolean {
  return window.matchMedia(WIDE_MQ).matches;
}

function subscribeViewport(onStoreChange: () => void): () => void {
  window.addEventListener("resize", onStoreChange);
  window.visualViewport?.addEventListener("resize", onStoreChange);
  return () => {
    window.removeEventListener("resize", onStoreChange);
    window.visualViewport?.removeEventListener("resize", onStoreChange);
  };
}

function viewportEpoch(): number {
  return Math.round((window.visualViewport?.height ?? window.innerHeight) * 10) + window.innerWidth;
}

type Props = { visible: NavVisibilityPayload };

/**
 * `md+`: equal-height row capped to the viewport band below the header.
 */
export function BentoHomeEqualRows({ visible }: Props) {
  const frameRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const [rowPx, setRowPx] = useState<number | null>(null);

  const isWide = useSyncExternalStore(subscribeWideMq, getWideMqSnapshot, () => false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const vpEpoch = useSyncExternalStore(subscribeViewport, viewportEpoch, () => 0);
  const visKey = JSON.stringify(visible);

  const measureTallestFrame = useCallback((): void => {
    const els = frameRefs.current;
    if (els.length !== 3 || els.some((e) => e == null)) return;
    const hs = els.map((el) => Math.ceil(el!.getBoundingClientRect().height));
    if (hs.some((h) => h < 1)) return;
    const natural = Math.max(hs[0]!, hs[1]!, hs[2]!);
    const available = getAvailableRowHeight();
    if (available < 1) return;
    const h = Math.max(MIN_ROW_PX, Math.min(natural, available));
    setRowPx((p) => (p === h ? p : h));
  }, []);

  useLayoutEffect(() => {
    if (!isWide) return;

    const run = () => {
      requestAnimationFrame(() => measureTallestFrame());
    };
    run();

    const seen = new Set<HTMLDivElement>();
    for (const el of frameRefs.current) {
      if (el) seen.add(el);
    }
    const ro = new ResizeObserver(run);
    for (const el of seen) ro.observe(el);
    void document.fonts?.ready?.then?.(run);

    return () => {
      ro.disconnect();
    };
  }, [isWide, visKey, vpEpoch, measureTallestFrame]);

  const isEqual = mounted && isWide && rowPx != null;

  return (
    <div
      className={cn(
        "bento-container bento-container--home w-full",
        isEqual && "bento-container--home-equal"
      )}
    >
      {(Object.keys(BentoRegistry) as BentoKey[]).map((key, index) => {
        const section = BentoRegistry[key];
        const newByHref = new Map(
          visible[key].map((v) => [v.href, v.isNew === true] as const)
        );
        const allowedHrefs = new Set(visible[key].map((v) => v.href));
        const items = section.series
          .filter((item) => allowedHrefs.has(item.href as string))
          .map((item) => {
            const href = item.href as string;
            return {
              label: item.name,
              sublabel: item.desc,
              href,
              isNew: newByHref.get(href) === true,
            };
          });

        const frameStyle: CSSProperties | undefined =
          isEqual && rowPx != null
            ? { height: rowPx, minHeight: 0, maxHeight: rowPx, boxSizing: "border-box" as const }
            : undefined;

        return (
          <div
            key={key}
            ref={(el) => {
              frameRefs.current[index] = el;
            }}
            className="bento-home-card-frame min-w-0 min-h-0 flex flex-col"
            style={frameStyle}
          >
            <BentoCard
              equalRow={isEqual}
              nodeKicker={section.nodeKicker}
              nodeId={section.label}
              title={section.title}
              subtitle={section.subtitle}
              titleVisualSrc={section.titleVisualSrc}
              titleVisualAlt={section.titleVisualAlt}
              items={items}
              showColophon={key === "B1"}
            />
          </div>
        );
      })}
    </div>
  );
}
