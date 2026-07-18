import assert from "node:assert/strict";
import test from "node:test";
import { GitHubClientError } from "./client.ts";
import { fetchGitHubCommitDetail } from "./commit-detail.ts";

const githubResponse = {
  sha: "abcdef1234567890",
  stats: { additions: 12, deletions: 4, total: 16 },
  files: [{
    filename: "src/app.ts",
    status: "modified",
    additions: 12,
    deletions: 4,
    changes: 16,
    blob_url: "https://github.com/team/repo/blob/abcdef1234567890/src/app.ts",
    raw_url: "https://raw.githubusercontent.com/team/repo/abcdef1234567890/src/app.ts",
    patch: "@@ -1 +1 @@\n-old\n+new",
  }],
  private_metadata: "must-not-leak",
};

test("commit detail client returns only display-safe stats and file patches", async () => {
  const detail = await fetchGitHubCommitDetail("secret-token", "team", "repo", "abcdef1234567890", async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(url.pathname, "/repos/team/repo/commits/abcdef1234567890");
    assert.equal(init?.method, "GET");
    assert.equal(init?.redirect, "manual");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer secret-token");
    return Response.json(githubResponse);
  });

  assert.deepEqual(detail.stats, { additions: 12, deletions: 4, total: 16, filesChanged: 1 });
  assert.equal(detail.files[0].patch, githubResponse.files[0].patch);
  assert.equal(JSON.stringify(detail).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(detail).includes("raw.githubusercontent.com"), false);
  assert.equal(JSON.stringify(detail).includes("secret-token"), false);
});

test("commit detail client maps malformed GitHub responses to a client error", async () => {
  await assert.rejects(
    fetchGitHubCommitDetail("token", "team", "repo", "abcdef1", async () => Response.json({ sha: "abcdef1" })),
    error => error instanceof GitHubClientError && error.kind === "invalid_response",
  );
});
