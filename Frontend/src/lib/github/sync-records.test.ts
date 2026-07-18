import assert from "node:assert/strict";
import test from "node:test";
import { repositoryActivityId } from "./project-activity.ts";
import type { GitHubSyncSnapshot } from "./sync-client.ts";
import { buildRepositorySyncRecords } from "./sync-records.ts";

const snapshot: GitHubSyncSnapshot = {
  branches: [{ name: "main", protected: true, latestCommitSha: "abcdef1234567890" }],
  commits: [{
    sha: "abcdef1234567890",
    message: "Timeline",
    messageBody: null,
    authorName: "Alex",
    authorEmail: null,
    authorGitHubLogin: "alex",
    authorAvatarUrl: null,
    committerName: "Alex",
    committedAt: "2026-07-18T00:00:00Z",
    parentShas: [],
    githubUrl: "https://github.com/team/repo/commit/abcdef1234567890",
    verificationStatus: "verified",
  }],
  pullRequests: [{
    githubId: 100,
    number: 3,
    title: "Timeline",
    description: null,
    state: "open",
    sourceBranch: "timeline",
    targetBranch: "main",
    headSha: "abcdef1234567890",
    authorGitHubLogin: "alex",
    authorAvatarUrl: null,
    githubCreatedAt: "2026-07-18T00:00:00Z",
    githubUpdatedAt: "2026-07-18T00:00:00Z",
    closedAt: null,
    mergedAt: null,
    mergedByGitHubLogin: null,
    githubUrl: "https://github.com/team/repo/pull/3",
    isDraft: false,
    isMergeable: true,
    hasConflicts: false,
    commentsCount: 0,
    commitsCount: 1,
    additions: 0,
    deletions: 0,
    changedFilesCount: 0,
  }],
  reviews: [{
    githubId: 200,
    pullRequestNumber: 3,
    reviewerGitHubLogin: "reviewer",
    reviewerAvatarUrl: null,
    body: null,
    state: "APPROVED",
    commitSha: "abcdef1234567890",
    submittedAt: "2026-07-18T01:00:00Z",
  }],
};

test("reprocessing the same GitHub snapshot produces the same entity IDs", async () => {
  const first = await buildRepositorySyncRecords("repository-id", "main", snapshot);
  const second = await buildRepositorySyncRecords("repository-id", "main", snapshot);
  assert.deepEqual(second, first);
  assert.equal(new Set(first.commits.map(item => item.id)).size, first.commits.length);
  assert.equal(first.reviews[0].pull_request_id, first.pullRequests[0].id);
});

test("the same webhook delivery identity cannot create a different activity ID", async () => {
  const first = await repositoryActivityId({ project_id: "project-id", idempotencyKey: "webhook:delivery-123" });
  const second = await repositoryActivityId({ project_id: "project-id", idempotencyKey: "webhook:delivery-123" });
  assert.equal(first, second);
});
