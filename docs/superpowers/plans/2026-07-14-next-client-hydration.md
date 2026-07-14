# Next.js Client Hydration Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Supabase session refresh on application routes while preventing the proxy from intercepting Next.js internal traffic such as the HMR WebSocket.

**Architecture:** Keep the matcher as a static literal in `proxy.ts`, as required by Next.js build-time analysis. Test the real exported config by loading Next.js SWC bindings and using Next.js's page-static-info parser and matcher compiler.

**Tech Stack:** Next.js 16, TypeScript, Node.js 22 built-in test runner

## Global Constraints

- Do not change the Supabase schema or RLS policies.
- Do not modify project data actions or unrelated workspace features.
- The proxy must match `/dashboard` and must not match any `/_next/` path.

---

### Task 1: Protect Next.js internal routes from the Supabase proxy

**Files:**
- Create: `Frontend/src/lib/proxy-matcher.test.ts`
- Modify: `Frontend/src/proxy.ts:11`
- Modify: `Frontend/package.json:5-10`

**Interfaces:**
- Consumes: the static `config.matcher` exported by `Frontend/src/proxy.ts` through Next.js's own static-analysis utilities.
- Produces: a proxy matcher that bypasses `/_next/` and protects application routes.

- [x] **Step 1: Write the failing regression test**

```ts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getPageStaticInfo } = require("next/dist/build/analysis/get-page-static-info");
const { PAGE_TYPES } = require("next/dist/lib/page-types");
const { loadBindings } = require("next/dist/build/swc");

await loadBindings();
const staticInfo = await getPageStaticInfo({
  pageFilePath: resolve("src/proxy.ts"),
  nextConfig: {},
  isDev: false,
  page: "/proxy",
  pageType: PAGE_TYPES.PAGES,
});
const matchers = staticInfo.middleware?.matchers ?? [];
const matches = (pathname: string) => matchers.some(({ regexp }: { regexp: string }) => new RegExp(regexp).test(pathname));

test("proxy matcher bypasses Next.js internal routes", () => {
  assert.equal(matches("/_next/webpack-hmr"), false);
  assert.equal(matches("/_next/static/chunks/app.js"), false);
});

test("proxy matcher keeps protecting application routes", () => {
  assert.equal(matches("/dashboard"), true);
  assert.equal(matches("/activity"), true);
});
```

- [x] **Step 2: Run the regression test and verify RED**

Run: `npm test`

Observed: FAIL because `/dashboard` did not match when the proxy config could not be statically parsed, and the original matcher matched `/_next/webpack-hmr` before the fix.

- [x] **Step 3: Add the minimal static matcher**

Update `Frontend/src/proxy.ts`:

```ts
export const config = { matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
```

Add the test script to `Frontend/package.json`:

```json
"test": "node --no-warnings --test --experimental-test-isolation=none src/lib/proxy-matcher.test.ts"
```

- [x] **Step 4: Run the regression test and verify GREEN**

Run: `npm test`

Observed: two tests passed and zero tests failed.

- [x] **Step 5: Run static and production verification**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `npx tsc --noEmit`

Expected: exit code 0 with no TypeScript errors.

Run: `npm run build`

Expected: exit code 0 and all application routes generated successfully.

- [x] **Step 6: Inspect the focused diff**

Run: `git diff -- Frontend/src/proxy.ts Frontend/src/lib/proxy-matcher.test.ts Frontend/package.json`

Expected: only the matcher fix, regression tests, and test script are present.

### Task 2: Verify the original browser symptom

**Files:**
- No file changes.

**Interfaces:**
- Consumes: the updated matcher from Task 1.
- Produces: manual confirmation that React interactions and the project Server Action work.

- [ ] **Step 1: Restart the development server**

Run from `Frontend`: `npm run dev -- --hostname 0.0.0.0`

Expected: Next.js reports the LAN URL and no build error.

- [ ] **Step 2: Hard-refresh and test hydration**

Open `/dashboard`, perform a hard refresh, and click `Search or jump to…`.

Expected: the search modal opens and the console no longer repeats `ERR_INVALID_HTTP_RESPONSE` for `/_next/webpack-hmr`.

- [ ] **Step 3: Test project creation**

Enter a project name and click `Create project`.

Expected: the terminal logs `POST /dashboard`, Supabase contains the new `projects` row, and the dashboard displays the created project.
