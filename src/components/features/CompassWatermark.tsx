"use client";

import { useEffect, useRef } from "react";

import { withBasePath } from "@/lib/base-path";

/**
 * Mouse-proximity reveal for the sundial watermark.
 * Runs in useEffect so Next 16 / React 19 never see a <script> in the tree
 * (those tags are not executed on the client).
 */
export function CompassWatermark() {
  const watermarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const watermark = watermarkRef.current;
    if (!watermark) return;

    const onMove = (event: MouseEvent) => {
      const rect = watermark.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const near = Math.hypot(event.clientX - x, event.clientY - y) < rect.width * 0.55;
      watermark.classList.toggle("is-revealed", near);
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      watermark.classList.remove("is-revealed");
    };
  }, []);

  return (
    <div
      ref={watermarkRef}
      id="p3-compass-watermark"
      className="p3-compass-watermark"
      aria-hidden="true"
    >
      <img src={withBasePath("/visuals/sundial_letters_outer.svg")} alt="" />
    </div>
  );
}
