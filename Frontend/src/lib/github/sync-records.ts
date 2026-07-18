import type { TablesInsert } from "@/lib/database.types";
import type { GitHubSyncSnapshot } from "./sync-client.ts";
import { stableUuid } from "./stable-id.ts";

export type RepositorySyncRecords = {
  branches: TablesInsert<"repository_branches">[];
  commits: TablesInsert<"repository_commits">[];
  pullRequests: TablesInsert<"repository_pull_requests">[];
  reviews: TablesInsert<"repository_pull_request_reviews">[];
};

export async function buildRepositorySyncRecords(
  repositoryId: string,
  defaultBranch: string | null,
  snapshot: GitHubSyncSnapshot,
): Promise<RepositorySyncRecords> {
  const pullRequestIds = new Map<number, string>();
  await Promise.all(snapshot.pullRequests.map(async pullRequest => {
    pullRequestIds.set(
      pullRequest.number,
      await stableUuid("repository-pull-request", `${repositoryId}:${pullRequest.githubId}`),
    );
  }));

  return {
    branches: await Promise.all(snapshot.branches.map(async branch => ({
      id: await stableUuid("repository-branch", `${repositoryId}:${branch.name}`),
      repository_id: repositoryId,
      branch_name: branch.name,
      latest_commit_sha: branch.latestCommitSha,
      is_default: branch.name === defaultBranch,
      is_protected: branch.protected,
    }))),
    commits: await Promise.all(snapshot.commits.map(async commit => ({
      id: await stableUuid("repository-commit", `${repositoryId}:${commit.sha}`),
      repository_id: repositoryId,
      sha: commit.sha,
      short_sha: commit.sha.slice(0, 7),
      message: commit.message,
      message_body: commit.messageBody,
      author_name: commit.authorName,
      author_email: commit.authorEmail,
      author_github_login: commit.authorGitHubLogin,
      author_avatar_url: commit.authorAvatarUrl,
      committer_name: commit.committerName,
      committed_at: commit.committedAt,
      parent_shas: commit.parentShas,
      github_url: commit.githubUrl,
      verification_status: commit.verificationStatus,
      updated_at: commit.committedAt ?? undefined,
    }))),
    pullRequests: snapshot.pullRequests.map(pullRequest => ({
      id: pullRequestIds.get(pullRequest.number)!,
      repository_id: repositoryId,
      github_pull_request_id: pullRequest.githubId,
      pull_request_number: pullRequest.number,
      title: pullRequest.title,
      description: pullRequest.description,
      state: pullRequest.state,
      source_branch: pullRequest.sourceBranch,
      target_branch: pullRequest.targetBranch,
      head_sha: pullRequest.headSha,
      author_github_login: pullRequest.authorGitHubLogin,
      author_avatar_url: pullRequest.authorAvatarUrl,
      github_created_at: pullRequest.githubCreatedAt,
      github_updated_at: pullRequest.githubUpdatedAt,
      closed_at: pullRequest.closedAt,
      merged_at: pullRequest.mergedAt,
      merged_by_github_login: pullRequest.mergedByGitHubLogin,
      github_url: pullRequest.githubUrl,
      is_draft: pullRequest.isDraft,
      is_mergeable: pullRequest.isMergeable,
      has_conflicts: pullRequest.hasConflicts,
      comments_count: pullRequest.commentsCount,
      commits_count: pullRequest.commitsCount,
      additions: pullRequest.additions,
      deletions: pullRequest.deletions,
      changed_files_count: pullRequest.changedFilesCount,
      reviews_count: snapshot.reviews.filter(review => review.pullRequestNumber === pullRequest.number).length,
      updated_at: pullRequest.githubUpdatedAt ?? pullRequest.githubCreatedAt ?? undefined,
    })),
    reviews: await Promise.all(snapshot.reviews.map(async review => ({
      id: await stableUuid("repository-review", `${repositoryId}:${review.githubId}`),
      pull_request_id: pullRequestIds.get(review.pullRequestNumber)!,
      github_review_id: review.githubId,
      reviewer_github_login: review.reviewerGitHubLogin,
      reviewer_avatar_url: review.reviewerAvatarUrl,
      review_body: review.body,
      review_state: review.state,
      commit_sha: review.commitSha,
      submitted_at: review.submittedAt,
    }))),
  };
}
