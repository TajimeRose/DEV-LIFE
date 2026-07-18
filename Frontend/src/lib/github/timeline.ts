import type { Tables } from "@/lib/database.types";

export type PullRequestStatus = "open" | "closed" | "merged";
export type ReviewStatus = "approved" | "changes_requested" | "pending" | "commented" | "dismissed";
export type SyncStatus = "started" | "succeeded" | "failed";
export type TimelineEventType =
  | "pull_request_opened"
  | "pull_request_updated"
  | "pull_request_closed"
  | "pull_request_merged"
  | "commit_pushed"
  | "review_submitted"
  | "sync_started"
  | "sync_succeeded"
  | "sync_failed"
  | "repository_connected";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  occurredAt: string;
  title: string;
  description: string | null;
  actor: string | null;
  status: PullRequestStatus | ReviewStatus | SyncStatus | "connected";
  pullRequestId: string | null;
  pullRequestNumber: number | null;
  sourceBranch: string | null;
  targetBranch: string | null;
  commitSha: string | null;
  commitShortSha: string | null;
  githubUrl: string | null;
  errorMessage: string | null;
  additions: number | null;
  deletions: number | null;
  filesChanged: number | null;
};

export type TimelineRows = {
  commits: Tables<"repository_commits">[];
  pullRequests: Tables<"repository_pull_requests">[];
  reviews: Array<Tables<"repository_pull_request_reviews"> & {
    pullRequest: Pick<Tables<"repository_pull_requests">, "id" | "pull_request_number" | "title">;
  }>;
  syncLogs: Tables<"repository_sync_logs">[];
  webhookDeliveries: Tables<"github_webhook_deliveries">[];
  activities: Tables<"project_activity_logs">[];
};

export function pullRequestVisualStatus(
  pullRequest: Pick<Tables<"repository_pull_requests">, "state" | "merged_at">,
): PullRequestStatus {
  if (pullRequest.merged_at) return "merged";
  return pullRequest.state.toLocaleLowerCase() === "closed" ? "closed" : "open";
}

export function reviewVisualStatus(state: string): ReviewStatus {
  const normalized = state.trim().toLocaleLowerCase().replaceAll(" ", "_");
  if (normalized === "approved") return "approved";
  if (normalized === "changes_requested" || normalized === "request_changes") return "changes_requested";
  if (normalized === "dismissed") return "dismissed";
  if (normalized === "commented" || normalized === "comment") return "commented";
  return "pending";
}

export function syncVisualStatus(status: string): SyncStatus {
  const normalized = status.trim().toLocaleLowerCase();
  if (["success", "succeeded", "completed", "complete"].includes(normalized)) return "succeeded";
  if (["failed", "failure", "error"].includes(normalized)) return "failed";
  return "started";
}

function syncTimestamp(syncLog: Tables<"repository_sync_logs">) {
  return syncVisualStatus(syncLog.status) === "started"
    ? syncLog.started_at
    : syncLog.completed_at ?? syncLog.started_at;
}

function eventIdentity(event: TimelineEvent) {
  if (event.type === "commit_pushed") return `commit:${event.commitSha}`;
  if (event.type.startsWith("pull_request_")) {
    return `pull-request:${event.pullRequestId}:${event.type}:${event.occurredAt}`;
  }
  return event.id;
}

export function dedupeTimelineEvents(events: TimelineEvent[]) {
  const identities = new Set<string>();
  return events.filter(event => {
    const identity = eventIdentity(event);
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
}

export function sortTimelineEvents(events: TimelineEvent[]) {
  return [...events].sort((left, right) => {
    const timestamp = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return timestamp || left.id.localeCompare(right.id);
  });
}

export function buildTimelineEvents(rows: TimelineRows) {
  const events: TimelineEvent[] = [];

  for (const commit of rows.commits) {
    events.push({
      id: `commit:${commit.id}`,
      type: "commit_pushed",
      occurredAt: commit.committed_at ?? commit.created_at,
      title: commit.message,
      description: commit.message_body,
      actor: commit.author_github_login ?? commit.author_name,
      status: "connected",
      pullRequestId: null,
      pullRequestNumber: null,
      sourceBranch: null,
      targetBranch: null,
      commitSha: commit.sha,
      commitShortSha: commit.short_sha ?? commit.sha.slice(0, 7),
      githubUrl: commit.github_url,
      errorMessage: null,
      additions: commit.additions,
      deletions: commit.deletions,
      filesChanged: commit.files_changed,
    });
  }

  for (const pullRequest of rows.pullRequests) {
    const currentStatus = pullRequestVisualStatus(pullRequest);
    const createEvent = (
      type: TimelineEventType,
      occurredAt: string,
      status: TimelineEvent["status"],
    ): TimelineEvent => ({
      id: `pull-request:${pullRequest.id}:${type}`,
      type,
      occurredAt,
      title: pullRequest.title,
      description: pullRequest.description,
      actor: pullRequest.author_github_login,
      status,
      pullRequestId: pullRequest.id,
      pullRequestNumber: pullRequest.pull_request_number,
      sourceBranch: pullRequest.source_branch,
      targetBranch: pullRequest.target_branch,
      commitSha: pullRequest.head_sha,
      commitShortSha: pullRequest.head_sha?.slice(0, 7) ?? null,
      githubUrl: pullRequest.github_url,
      errorMessage: null,
      additions: pullRequest.additions,
      deletions: pullRequest.deletions,
      filesChanged: pullRequest.changed_files_count,
    });
    const createdAt = pullRequest.github_created_at ?? pullRequest.created_at;
    const finalAt = pullRequest.merged_at ?? pullRequest.closed_at;
    events.push(createEvent("pull_request_opened", createdAt, "open"));
    if (
      pullRequest.github_updated_at &&
      pullRequest.github_updated_at !== createdAt &&
      pullRequest.github_updated_at !== finalAt
    ) {
      events.push(createEvent("pull_request_updated", pullRequest.github_updated_at, currentStatus));
    }
    if (pullRequest.merged_at) {
      events.push(createEvent("pull_request_merged", pullRequest.merged_at, "merged"));
    } else if (pullRequest.closed_at) {
      events.push(createEvent("pull_request_closed", pullRequest.closed_at, "closed"));
    }
  }

  for (const review of rows.reviews) {
    const status = reviewVisualStatus(review.review_state);
    events.push({
      id: `review:${review.github_review_id ?? review.id}`,
      type: "review_submitted",
      occurredAt: review.submitted_at ?? review.created_at,
      title: `Review on #${review.pullRequest.pull_request_number}: ${review.pullRequest.title}`,
      description: review.review_body,
      actor: review.reviewer_github_login,
      status,
      pullRequestId: review.pullRequest.id,
      pullRequestNumber: review.pullRequest.pull_request_number,
      sourceBranch: null,
      targetBranch: null,
      commitSha: review.commit_sha,
      commitShortSha: review.commit_sha?.slice(0, 7) ?? null,
      githubUrl: null,
      errorMessage: null,
      additions: null,
      deletions: null,
      filesChanged: null,
    });
  }

  for (const syncLog of rows.syncLogs) {
    const status = syncVisualStatus(syncLog.status);
    events.push({
      id: `sync:${syncLog.id}:${status}`,
      type: `sync_${status}` as TimelineEventType,
      occurredAt: syncTimestamp(syncLog),
      title: status === "failed" ? "Repository synchronization failed" : status === "succeeded" ? "Repository synchronized" : "Repository synchronization started",
      description: `${syncLog.sync_type} sync · ${syncLog.commits_processed} commits · ${syncLog.pull_requests_processed} pull requests · ${syncLog.branches_processed} branches`,
      actor: null,
      status,
      pullRequestId: null,
      pullRequestNumber: null,
      sourceBranch: null,
      targetBranch: null,
      commitSha: null,
      commitShortSha: null,
      githubUrl: null,
      errorMessage: syncLog.error_message,
      additions: null,
      deletions: null,
      filesChanged: null,
    });
  }

  for (const delivery of rows.webhookDeliveries.filter(item => syncVisualStatus(item.status) === "failed")) {
    events.push({
      id: `webhook:${delivery.delivery_id}`,
      type: "sync_failed",
      occurredAt: delivery.processed_at ?? delivery.received_at,
      title: `GitHub webhook failed: ${delivery.github_event}`,
      description: `Delivery ${delivery.delivery_id}`,
      actor: null,
      status: "failed",
      pullRequestId: null,
      pullRequestNumber: null,
      sourceBranch: null,
      targetBranch: null,
      commitSha: null,
      commitShortSha: null,
      githubUrl: null,
      errorMessage: delivery.error_message,
      additions: null,
      deletions: null,
      filesChanged: null,
    });
  }

  for (const activity of rows.activities.filter(item => item.action_type === "repository_connected")) {
    events.push({
      id: `activity:${activity.id}`,
      type: "repository_connected",
      occurredAt: activity.occurred_at,
      title: activity.title,
      description: activity.description,
      actor: activity.actor_github_login,
      status: "connected",
      pullRequestId: null,
      pullRequestNumber: null,
      sourceBranch: null,
      targetBranch: null,
      commitSha: activity.commit_sha,
      commitShortSha: activity.commit_sha?.slice(0, 7) ?? null,
      githubUrl: null,
      errorMessage: null,
      additions: null,
      deletions: null,
      filesChanged: null,
    });
  }

  return sortTimelineEvents(dedupeTimelineEvents(events));
}
