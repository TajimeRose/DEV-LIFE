import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { timelineViewState } from "./timeline-view.ts";

test("timeline loading, error, empty, and populated views are controlled", () => {
  assert.equal(timelineViewState(true, "", 0), "loading");
  assert.equal(timelineViewState(false, "failed", 0), "error");
  assert.equal(timelineViewState(false, "", 0), "empty");
  assert.equal(timelineViewState(false, "", 1), "timeline");
});

test("timeline mobile layout prevents horizontal page overflow", async () => {
  const css = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media\(max-width:600px\)[\s\S]*?\.repository-timeline-scroll\{grid-auto-columns:100%;grid-auto-flow:row;overflow:visible/);
  assert.match(css, /\.timeline-card-button,.timeline-static-card\{min-width:0\}/);
});
