import test from "node:test";
import assert from "node:assert/strict";
import { suggestItemCategory } from "./categorize.js";

test("suggestItemCategory detects software text", () => {
  assert.equal(suggestItemCategory("GitHub API subscription"), "Software");
});

test("suggestItemCategory falls back to Other", () => {
  assert.equal(suggestItemCategory("Misc expense without hints"), "Other");
});
