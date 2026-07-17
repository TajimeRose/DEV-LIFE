import assert from "node:assert/strict";
import test from "node:test";
import { GitHubClientError, listGitHubRepositories } from "./client.ts";
import { GITHUB_PAGE_SIZE } from "./config.ts";
import { GitHubQueryError, parseGitHubRepositoryQuery, type GitHubRepositoryQuery } from "./query.ts";
import { MemoryRateLimiter } from "./rate-limit.ts";
import { sanitizeGitHubRepositories } from "./repository.ts";
import { openGitHubToken, sealGitHubToken } from "./token-crypto.ts";

const rawRepository = {
  id: 42,
  node_id: "R_repo",
  name: "dev-life",
  full_name: "owner/dev-life",
  owner: { login: "owner", avatar_url: "https://avatars.githubusercontent.com/u/1" },
  description: "<script>alert('x')</script>",
  html_url: "https://github.com/owner/dev-life",
  private: false,
  fork: false,
  archived: false,
  disabled: false,
  visibility: "public",
  default_branch: "main",
  language: "TypeScript",
  stargazers_count: 2,
  forks_count: 1,
  open_issues_count: 3,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  pushed_at: null,
  permissions: { admin: true },
  temp_clone_token: "must-not-leak",
  clone_url: "https://secret.example",
};

const query: GitHubRepositoryQuery = {
  page: 1,
  visibility: "public",
  sort: "updated",
  direction: "desc",
  affiliation: "all",
  archived: "all",
  search: "",
  perPage: GITHUB_PAGE_SIZE,
};

test("repository sanitizer strips unexpected and sensitive fields", () => {
  const result = sanitizeGitHubRepositories([rawRepository]);
  assert.equal(result.length, 1);
  assert.equal(result[0].htmlUrl, "https://github.com/owner/dev-life");
  assert.equal(result[0].description, rawRepository.description);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("permissions"), false);
  assert.equal(serialized.includes("must-not-leak"), false);
  assert.equal(serialized.includes("clone_url"), false);
});

test("repository sanitizer rejects non-GitHub repository links", () => {
  assert.throws(() => sanitizeGitHubRepositories([{ ...rawRepository, html_url: "https://evil.example/repo" }]));
});

test("repository query validation rejects arbitrary values and disabled private access", () => {
  assert.throws(() => parseGitHubRepositoryQuery(new URL("https://app.test/api?page=99"), false), GitHubQueryError);
  assert.throws(() => parseGitHubRepositoryQuery(new URL("https://app.test/api?sort=stars"), false), GitHubQueryError);
  assert.throws(() => parseGitHubRepositoryQuery(new URL("https://app.test/api?visibility=private"), false), error => error instanceof GitHubQueryError && error.reason === "private_disabled");
  assert.equal(parseGitHubRepositoryQuery(new URL("https://app.test/api?page=2"), false).page, 2);
});

test("in-memory rate limiter isolates users and resets its window", () => {
  const limiter = new MemoryRateLimiter(2, 1000);
  assert.equal(limiter.allow("user-a", 0), true);
  assert.equal(limiter.allow("user-a", 1), true);
  assert.equal(limiter.allow("user-a", 2), false);
  assert.equal(limiter.allow("user-b", 2), true);
  assert.equal(limiter.allow("user-a", 1001), true);
});

test("encrypted token round-trips without exposing plaintext", async () => {
  const key = "a".repeat(64);
  const payload = { userId: "11111111-1111-4111-8111-111111111111", token: "github-secret-token", expiresAt: Date.now() + 60_000 };
  const sealed = await sealGitHubToken(payload, key);
  assert.equal(sealed.includes(payload.token), false);
  assert.deepEqual(await openGitHubToken(sealed, key), payload);
  assert.equal(await openGitHubToken(`${sealed}tampered`, key), null);
});

test("GitHub client uses only GET against the fixed API origin and strips raw data", async () => {
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(url.pathname, "/user/repos");
    assert.equal(init?.method, "GET");
    assert.equal(init?.redirect, "manual");
    return Response.json([rawRepository], { headers: { link: '<https://api.github.com/user/repos?page=2>; rel="next"' } });
  };
  const result = await listGitHubRepositories("test-token", query, false, fetcher);
  assert.equal(result.repositories.length, 1);
  assert.equal(result.hasNext, true);
  assert.equal(JSON.stringify(result).includes("test-token"), false);
});

test("GitHub client rejects malformed responses", async () => {
  await assert.rejects(
    listGitHubRepositories("test-token", query, false, async () => Response.json([{ id: "invalid" }])),
    error => error instanceof GitHubClientError && error.kind === "invalid_response",
  );
});

test("GitHub client aborts requests after the configured timeout", async () => {
  const fetcher = (_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  await assert.rejects(
    listGitHubRepositories("test-token", query, false, fetcher, 5),
    error => error instanceof GitHubClientError && error.kind === "timeout",
  );
});
