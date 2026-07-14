import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getPageStaticInfo } = require("next/dist/build/analysis/get-page-static-info") as {
  getPageStaticInfo: (input: object) => Promise<{ middleware?: { matchers?: Array<{ regexp: string }> } }>;
};
const { PAGE_TYPES } = require("next/dist/lib/page-types") as { PAGE_TYPES: { PAGES: string } };
const { loadBindings } = require("next/dist/build/swc") as { loadBindings: () => Promise<unknown> };

await loadBindings();
const staticInfo = await getPageStaticInfo({
  pageFilePath: resolve("src/proxy.ts"),
  nextConfig: {},
  isDev: false,
  page: "/proxy",
  pageType: PAGE_TYPES.PAGES,
});
const matchers = staticInfo.middleware?.matchers ?? [];
const matches = (pathname: string) => matchers.some(({ regexp }) => new RegExp(regexp).test(pathname));

test("proxy matcher bypasses Next.js internal routes", () => {
  assert.equal(matches("/_next/webpack-hmr"), false);
  assert.equal(matches("/_next/static/chunks/app.js"), false);
});

test("proxy matcher keeps protecting application routes", () => {
  assert.equal(matches("/dashboard"), true);
  assert.equal(matches("/activity"), true);
});
