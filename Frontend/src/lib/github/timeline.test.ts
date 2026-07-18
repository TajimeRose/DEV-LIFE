import assert from "node:assert/strict";
import test from "node:test";
import type { Tables } from "@/lib/database.types";
import {
  buildTimelineEvents,
  pullRequestVisualStatus,
  reviewVisualStatus,
  sortTimelineEvents,
  syncVisualStatus,
  type TimelineEvent,
} from "./timeline.ts";

const commit = {
  id: "commit-id",
  repository_id: "repository-id",
  sha: "abcdef1234567890",
  short_sha: "abcdef1",
  message: "Standalone commit",
  message_body: null,
  author_name: "Alex",
  author_email: null,
  author_github_login: "alex",
  author_avatar_url: null,
  committer_name: "Alex",
  committed_at: "2026-07-18T10:00:00Z",
  parent_shas: [],
  github_url: "https://github.com/team/repo/commit/abcdef1234567890",
  verification_status: "verified",
  additions: 4,
  deletions: 1,
  files_changed: 2,
  created_at: "2026-07-18T10:00:00Z",
  updated_at: "2026-07-18T10:00:00Z",
} satisfies Tables<"repository_commits">;

const pullRequest = {
  id: "pr-id",
  repository_id: "repository-id",
  github_pull_request_id: 99,
  pull_request_number: 12,
  title: "Repository timeline",
  description: null,
  state: "closed",
  source_branch: "feature/timeline",
  target_branch: "main",
  head_sha: null,
  author_github_login: "alex",
  author_avatar_url: null,
  github_created_at: "2026-07-18T08:00:00Z",
  github_updated_at: "2026-07-18T11:00:00Z",
  closed_at: "2026-07-18T11:00:00Z",
  merged_at: "2026-07-18T11:00:00Z",
  merged_by_github_login: "reviewer",
  github_url: "https://github.com/team/repo/pull/12",
  is_draft: false,
  is_mergeable: true,
  has_conflicts: false,
  merge_method: "squash",
  review_status: "approved",
  reviews_count: 1,
  comments_count: 0,
  commits_count: 1,
  additions: 4,
  deletions: 1,
  changed_files_count: 2,
  created_at: "2026-07-18T08:00:00Z",
  updated_at: "2026-07-18T11:00:00Z",
} satisfies Tables<"repository_pull_requests">;

function emptyRows() {
  return {
    commits: [],
    pullRequests: [],
    reviews: [],
    syncLogs: [],
    webhookDeliveries: [],
    activities: [],
  };
}

test("timeline events are sorted newest first", () => {
  const oldEvent = { id: "old", occurredAt: "2026-01-01T00:00:00Z" } as TimelineEvent;
  const newEvent = { id: "new", occurredAt: "2026-02-01T00:00:00Z" } as TimelineEvent;
  assert.deepEqual(sortTimelineEvents([oldEvent, newEvent]).map(item => item.id), ["new", "old"]);
});

test("Pull Request, review, and synchronization statuses map correctly", () => {
  assert.equal(pullRequestVisualStatus({ state: "open", merged_at: null }), "open");
  assert.equal(pullRequestVisualStatus({ state: "closed", merged_at: null }), "closed");
  assert.equal(pullRequestVisualStatus({ state: "closed", merged_at: "2026-01-01T00:00:00Z" }), "merged");
  assert.equal(reviewVisualStatus("CHANGES_REQUESTED"), "changes_requested");
  assert.equal(reviewVisualStatus("APPROVED"), "approved");
  assert.equal(syncVisualStatus("completed"), "succeeded");
  assert.equal(syncVisualStatus("failed"), "failed");
  assert.equal(syncVisualStatus("running"), "started");
});

test("standalone commits remain visible and duplicate commits are removed", () => {
  const events = buildTimelineEvents({ ...emptyRows(), commits: [commit, { ...commit, id: "duplicate-row" }] });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "commit_pushed");
  assert.equal(events[0].pullRequestId, null);
  assert.equal(events[0].commitShortSha, "abcdef1");
});

test("merged Pull Requests and submitted reviews produce distinct events", () => {
  const events = buildTimelineEvents({
    ...emptyRows(),
    pullRequests: [pullRequest],
    reviews: [{
      id: "review-id",
      pull_request_id: pullRequest.id,
      github_review_id: 500,
      reviewer_github_login: "reviewer",
      reviewer_avatar_url: null,
      reviewer_user_id: null,
      review_body: "Looks good",
      review_state: "APPROVED",
      commit_sha: null,
      submitted_at: "2026-07-18T10:30:00Z",
      created_at: "2026-07-18T10:30:00Z",
      pullRequest: {
        id: pullRequest.id,
        pull_request_number: pullRequest.pull_request_number,
        title: pullRequest.title,
      },
    }],
  });
  assert.deepEqual(events.map(event => event.type), ["pull_request_merged", "review_submitted", "pull_request_opened"]);
  assert.equal(events[1].status, "approved");
});

test("synchronization success and failure render as readable events", () => {
  const base = {
    id: "sync-id",
    repository_id: "repository-id",
    sync_type: "manual",
    started_at: "2026-07-18T09:00:00Z",
    completed_at: "2026-07-18T09:01:00Z",
    branches_processed: 1,
    commits_processed: 2,
    pull_requests_processed: 3,
    created_at: "2026-07-18T09:00:00Z",
  };
  const events = buildTimelineEvents({
    ...emptyRows(),
    syncLogs: [
      { ...base, id: "failed", status: "failed", error_message: "GitHub synchronization failed." },
      { ...base, id: "success", status: "success", error_message: null },
    ],
  });
  assert.deepEqual(events.map(event => event.type).sort(), ["sync_failed", "sync_succeeded"]);
  assert.equal(events.find(event => event.type === "sync_failed")?.errorMessage, "GitHub synchronization failed.");
});
