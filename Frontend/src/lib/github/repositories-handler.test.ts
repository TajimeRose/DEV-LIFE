import assert from "node:assert/strict";
import test from "node:test";
import { GitHubClientError } from "./client.ts";
import { handleRepositoriesRequest } from "./repositories-handler.ts";

const request = () => new Request("https://app.test/api/github/repositories");
const repository = {
  id: 1,
  nodeId: "R_1",
  name: "repo",
  fullName: "owner/repo",
  ownerLogin: "owner",
  ownerAvatarUrl: null,
  description: null,
  htmlUrl: "https://github.com/owner/repo",
  private: false,
  fork: false,
  archived: false,
  disabled: false,
  visibility: "public" as const,
  defaultBranch: "main",
  language: null,
  stargazersCount: 0,
  forksCount: 0,
  openIssuesCount: 0,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  pushedAt: null,
};

function dependencies(overrides: Partial<Parameters<typeof handleRepositoriesRequest>[1]> = {}) {
  return {
    authenticate: async () => ({ userId: "user-a", githubIdentity: true }),
    readToken: async () => "server-only-token",
    rateLimit: () => true,
    privateReposEnabled: false,
    listRepositories: async () => ({ repositories: [repository], hasNext: false }),
    ...overrides,
  };
}

test("unauthenticated repository request returns 401", async () => {
  const response = await handleRepositoriesRequest(request(), dependencies({ authenticate: async () => null }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
});

test("missing GitHub connection returns a safe reconnect error", async () => {
  const response = await handleRepositoriesRequest(request(), dependencies({ readToken: async () => null }));
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error.code, "GITHUB_AUTH_REQUIRED");
  assert.equal(JSON.stringify(body).includes("server-only-token"), false);
});

test("expired or revoked GitHub token returns reconnect message", async () => {
  const response = await handleRepositoriesRequest(request(), dependencies({
    listRepositories: async () => { throw new GitHubClientError("auth"); },
  }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "GITHUB_AUTH_REQUIRED");
});

test("rate limited repository request returns 429 without reading a token", async () => {
  let tokenRead = false;
  const response = await handleRepositoriesRequest(request(), dependencies({
    rateLimit: () => false,
    readToken: async () => { tokenRead = true; return "secret"; },
  }));
  assert.equal(response.status, 429);
  assert.equal(tokenRead, false);
});

test("successful response never includes the provider token", async () => {
  const response = await handleRepositoriesRequest(request(), dependencies());
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(body.includes("server-only-token"), false);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
