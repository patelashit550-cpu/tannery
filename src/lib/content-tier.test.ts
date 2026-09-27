import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isStageIncludedInBuild, normalizeStage } from "./content-tier";

describe("content-tier", () => {
  it("treats missing stage as draft", () => {
    assert.equal(normalizeStage(undefined), "draft");
    assert.equal(normalizeStage(" Published "), "published");
  });

  it("hides drafts from global builds", () => {
    assert.equal(isStageIncludedInBuild("draft", "global"), false);
    assert.equal(isStageIncludedInBuild("published", "global"), true);
    assert.equal(isStageIncludedInBuild("canonical", "global"), true);
  });

  it("includes review on preprod but not global", () => {
    assert.equal(isStageIncludedInBuild("review", "preprod"), true);
    assert.equal(isStageIncludedInBuild("review", "global"), false);
    assert.equal(isStageIncludedInBuild("draft", "preprod"), false);
  });

  it("includes every stage on local", () => {
    assert.equal(isStageIncludedInBuild("draft", "local"), true);
    assert.equal(isStageIncludedInBuild("review", "local"), true);
  });
});
