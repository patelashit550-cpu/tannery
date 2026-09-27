import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { serializeJsonLd, splitEmbeddedJsonLd } from "./json-ld";

describe("json-ld", () => {
  it("escapes script-breaking characters", () => {
    const html = serializeJsonLd({ headline: "</script><p>x" });
    assert.equal(html.includes("</script>"), false);
    assert.equal(html.includes("\\u003c/script>"), true);
  });

  it("lifts embedded JSON-LD and keeps prose", () => {
    const { prose, graphs } = splitEmbeddedJsonLd(
      "Hello\n\n<script type=\"application/ld+json\">{\"@type\":\"Thing\"}</script>\n\nWorld"
    );
    assert.equal(prose.includes("Hello"), true);
    assert.equal(prose.includes("World"), true);
    assert.equal(prose.includes("application/ld+json"), false);
    assert.deepEqual(graphs, [{ "@type": "Thing" }]);
  });
});
