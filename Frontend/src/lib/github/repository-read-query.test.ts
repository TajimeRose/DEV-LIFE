import assert from "node:assert/strict";
import test from "node:test";
import {
  paginationData,
  parseCommitListQuery,
  parsePullRequestListQuery,
  postgrestContainsPattern,
} from "./repository-read-query.ts";

test("commit query accepts accurate filters and has no branch filter", () => {
  const parsed = parseCommitListQuery(new URL("https://example.test?search=fix&author=alice&from=2026-01-01T00%3A00%3A00Z&to=2026-02-01T00%3A00%3A00Z&page=2&limit=25"));
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.deepEqual(parsed.data, {
    search: "fix",
    author: "alice",
    from: "2026-01-01T00:00:00Z",
    to: "2026-02-01T00:00:00Z",
    page: 2,
    limit: 25,
  });
  assert.equal("branch" in parsed.data, false);
  assert.equal(parseCommitListQuery(new URL("https://example.test?branch=main")).success, false);
});

test("repository list query validation rejects bad ranges, pagination, dates, and PR state", () => {
  assert.equal(parseCommitListQuery(new URL("https://example.test?page=0")).success, false);
  assert.equal(parseCommitListQuery(new URL("https://example.test?limit=51")).success, false);
  assert.equal(parseCommitListQuery(new URL("https://example.test?from=not-a-date")).success, false);
  assert.equal(parseCommitListQuery(new URL("https://example.test?from=2026-02-01T00%3A00%3A00Z&to=2026-01-01T00%3A00%3A00Z")).success, false);
  assert.equal(parseCommitListQuery(new URL("https://example.test?unknown=value")).success, false);
  assert.equal(parsePullRequestListQuery(new URL("https://example.test?state=draft")).success, false);
});

test("PostgREST search patterns escape wildcard and expression delimiters", () => {
  assert.equal(postgrestContainsPattern('fix%_"\\,title.eq.secret'), '"%fix\\%\\_\\"\\\\,title.eq.secret%"');
});

test("pagination metadata uses exact totals", () => {
  assert.deepEqual(paginationData(2, 20, 41), {
    page: 2,
    limit: 20,
    total: 41,
    totalPages: 3,
    hasMore: true,
  });
});
