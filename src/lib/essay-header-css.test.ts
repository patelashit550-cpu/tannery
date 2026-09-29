import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../app/globals.css"),
  "utf8"
);

test("essay subtitles left-align the header and emerald rule without a plate split", () => {
  assert.match(
    css,
    /\.p3-narrative-article__header:has\(\.p3-topic-article__subtitle\)\s*\{[^}]*text-align:\s*left/s
  );
  assert.match(
    css,
    /\.p3-narrative-article__header:has\(\.p3-topic-article__subtitle\)\s+\.p3-narrative-article__rule\s*\{[^}]*margin-left:\s*0/s
  );
});

test("essay subtitle kicker is readable on the light canvas, not dim zinc-500", () => {
  assert.match(css, /--p3-essay-subtitle-color:\s*#52525b/);
  const subtitleBlock = css.match(/\.p3-topic-article__subtitle\s*\{[^}]+\}/);
  assert.ok(subtitleBlock, "expected .p3-topic-article__subtitle rule");
  assert.doesNotMatch(subtitleBlock[0], /#71717a/);
  assert.match(subtitleBlock[0], /color:\s*var\(--p3-essay-subtitle-color\)/);
  assert.match(subtitleBlock[0], /text-align:\s*left/);
});

test("essay page titles share three increments below the prior 2.5rem stack", () => {
  assert.match(css, /--p3-essay-title-size:\s*clamp\(0\.945rem,\s*3\.8vw,\s*1\.35rem\)/);
  assert.match(css, /--p3-essay-title-size-md:\s*1\.6875rem/);
  assert.match(css, /--p3-essay-title-size-fit:\s*clamp\(0\.9rem,\s*2\.2vw,\s*1\.3125rem\)/);
  assert.match(css, /--p3-essay-inline-title-size:\s*1\.625rem/);

  const titleBlock = css.match(/\.p3-narrative-article__title\s*\{[^}]+\}/);
  assert.ok(titleBlock, "expected .p3-narrative-article__title rule");
  assert.match(titleBlock[0], /font-size:\s*var\(--p3-essay-title-size\)/);
  assert.doesNotMatch(titleBlock[0], /2\.5rem/);
  assert.doesNotMatch(titleBlock[0], /2\.125rem/);
  assert.doesNotMatch(titleBlock[0], /1\.875rem/);
  assert.doesNotMatch(titleBlock[0], /clamp\(1\.35rem,\s*5\.5vw/);

  assert.match(
    css,
    /@media\s*\(min-width:\s*768px\)\s*\{\s*\.p3-narrative-article__title\s*\{[^}]*font-size:\s*var\(--p3-essay-title-size-md\)/s
  );
  assert.doesNotMatch(css, /\.p3-narrative-article__title\s*\{[^}]*font-size:\s*2\.5rem/s);

  const topicTitleBlock = css.match(/\.p3-topic-article__title\s*\{[^}]+\}/);
  assert.ok(topicTitleBlock, "expected .p3-topic-article__title rule");
  assert.match(topicTitleBlock[0], /font-size:\s*var\(--p3-essay-title-size\)/);

  assert.match(
    css,
    /\.p3-narrative-body h1:not\(\.p3-narrative-article__title\)\s*\{[^}]*font-size:\s*var\(--p3-essay-inline-title-size\)/s
  );
});

test("desktop plate-split locks the left lead and scrolls copy", () => {
  assert.match(css, /--p3-essay-plate-split-image:\s*minmax\(12rem,\s*0\.42fr\)/);
  assert.match(css, /--p3-essay-plate-split-copy:\s*minmax\(0,\s*0\.58fr\)/);
  assert.match(
    css,
    /\.p3-narrative-body--with-plate\s*>\s*\.p3-narrative-body__copy\s*\{[^}]*overflow-y:\s*auto/s
  );
  assert.match(css, /--p3-photo-emerald-mat-fill:\s*rgba\(16,\s*185,\s*129,\s*0\.85\)/);
});

test("compass watermark size tokens stay untouched", () => {
  const compass = css.match(/\.p3-compass-watermark\s*\{[^}]+\}/);
  assert.ok(compass, "expected .p3-compass-watermark rule");
  assert.match(compass[0], /z-index:\s*2/);
  assert.match(compass[0], /opacity:\s*0\.07/);
  assert.match(compass[0], /filter:\s*grayscale\(1\)\s*blur\(3px\)/);
});
